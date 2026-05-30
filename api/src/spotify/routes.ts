import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyAccessToken } from "../lib/jwt.js";

export const spotifyRouter = Router();

const isProd = env.NODE_ENV === "production";
const crossSiteCookie = {
  httpOnly: true as const,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  secure: isProd,
  path: "/",
};

const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  // playlist-read-private gates access to the user's *own* private playlists,
  // playlist-read-collaborative is required separately for the (very common)
  // case of collaborative playlists. Missing the latter is what produces the
  // "Spotify: Forbidden" 403 on /v1/playlists/{id}/tracks for shared playlists.
  "playlist-read-private",
  "playlist-read-collaborative",
  // Liked Songs — handy for the playlists tab even though we don't surface
  // it as its own pseudo-playlist yet.
  "user-library-read",
  "user-read-recently-played",
  "user-top-read",
].join(" ");

// Kick off Spotify OAuth — user is already signed in with Google.
// Auth can come from: cookie, Bearer header, or a one-time ?ticket= query
// param (used by top-level navigations when third-party cookies are blocked).
spotifyRouter.get("/connect", (req, res, next) => {
  // If a ticket is provided, verify it and treat the bearer as authenticated.
  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";
  if (ticket) {
    try {
      const claims = jwt.verify(ticket, env.JWT_SECRET) as {
        sub: string;
        kind?: string;
      };
      if (claims.kind !== "ticket") throw new Error("Not a ticket");
      // Stamp req.user so the handler below can use it like the cookie path.
      (req as typeof req & { user: { sub: string; email: string; handle: string } }).user = {
        sub: claims.sub,
        email: "",
        handle: "",
      };
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid ticket" });
    }
  }
  // Otherwise fall through to the cookie/Bearer path.
  return requireAuth(req, res, next);
}, (req, res) => {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_REDIRECT_URI) {
    return res.status(500).json({ error: "Spotify not configured" });
  }
  const state = crypto.randomBytes(16).toString("hex");
  // Encode our user id in the state so the callback can look up the right account.
  const encoded = `${state}:${req.user!.sub}`;
  res.cookie("spotify_state", state, { ...crossSiteCookie, maxAge: 5 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state: encoded,
    show_dialog: "false",
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

spotifyRouter.get("/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "");
    const stateRaw = String(req.query.state ?? "");
    const [state, userId] = stateRaw.split(":");
    if (!code || !state || state !== req.cookies?.spotify_state || !userId) {
      return res.status(400).json({ error: "Invalid Spotify state" });
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.SPOTIFY_REDIRECT_URI!,
      }),
    });
    if (!tokenRes.ok) throw new Error("Spotify token exchange failed");
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await meRes.json()) as { id: string; product: string };

    await prisma.user.update({
      where: { id: userId },
      data: {
        spotifyId: profile.id,
        spotifyAccessToken: tokens.access_token,
        spotifyRefreshToken: tokens.refresh_token,
        spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        spotifyProduct: profile.product,
      },
    });

    res.clearCookie("spotify_state", { ...crossSiteCookie });
    res.redirect(`${env.WEB_ORIGIN}/dashboard?spotify=connected`);
  } catch (err) {
    next(err);
  }
});

// Refresh a user's Spotify access token if expired. Returns a fresh token (used by sockets).
export async function refreshSpotifyTokenForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.spotifyRefreshToken) throw new Error("No Spotify refresh token");
  if (user.spotifyTokenExpiry && user.spotifyTokenExpiry > new Date(Date.now() + 60_000)) {
    return user.spotifyAccessToken!;
  }
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotifyRefreshToken,
    }),
  });
  const tokens = (await res.json()) as { access_token: string; expires_in: number };
  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: tokens.access_token,
      spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

// Hand the user's current Spotify access token to the Web Playback SDK.
// Refreshes the token first if it's about to expire. Premium-only — free
// users can still call this; the SDK just won't initialize for them.
spotifyRouter.get("/token", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user?.spotifyRefreshToken) {
      return res.status(409).json({ error: "Spotify not connected" });
    }
    const token = await refreshSpotifyTokenForUser(req.user!.sub);
    const expiresInMs =
      user.spotifyTokenExpiry && user.spotifyTokenExpiry > new Date()
        ? user.spotifyTokenExpiry.getTime() - Date.now()
        : 3500_000;
    res.json({
      access_token: token,
      product: user.spotifyProduct,
      expires_in_ms: expiresInMs,
    });
  } catch (err) {
    next(err);
  }
});

// Search proxy — frontend hits this to find tracks for the queue.
//
// Previously this just forwarded `data` from Spotify regardless of status —
// which meant a 401/403/429 from Spotify silently showed up on the client as
// "No results" because data.tracks was undefined. Now we surface those.
spotifyRouter.get("/search", requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").slice(0, 200);
    if (!q) return res.json({ tracks: { items: [] } });

    const token = await refreshSpotifyTokenForUser(req.user!.sub).catch((e) => {
      console.warn("[spotify:search] token refresh failed:", (e as Error).message);
      throw new Error("Spotify not connected. Reconnect from your account page.");
    });

    const r = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=20&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.warn(`[spotify:search] upstream ${r.status}: ${errText}`);
      // 401 = expired token, 403 = scope/region, 429 = rate limited
      const friendly =
        r.status === 401
          ? "Spotify token expired. Reconnect from your account page."
          : r.status === 403
          ? "Spotify rejected this query — your account region may not have access."
          : r.status === 429
          ? "Spotify rate-limited us. Try again in a few seconds."
          : `Spotify returned ${r.status}.`;
      return res.status(r.status === 401 ? 401 : 502).json({ error: friendly });
    }

    const data = (await r.json()) as { tracks?: { items?: unknown[] } };
    console.log(`[spotify:search] q="${q}" → ${data.tracks?.items?.length ?? 0} items`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
