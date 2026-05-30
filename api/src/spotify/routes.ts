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

  // Optional ?return_to=/some/path — must be a relative path on our own
  // origin. Rejecting anything else stops this from becoming an open-redirect
  // primitive (e.g. ?return_to=https://evil.example/phish would otherwise
  // bounce the user off-site post-auth).
  const rawReturnTo = typeof req.query.return_to === "string" ? req.query.return_to : "";
  if (
    rawReturnTo &&
    rawReturnTo.length < 512 &&
    rawReturnTo.startsWith("/") &&
    !rawReturnTo.startsWith("//") &&
    !rawReturnTo.includes("://")
  ) {
    res.cookie("spotify_return_to", rawReturnTo, {
      ...crossSiteCookie,
      maxAge: 5 * 60 * 1000,
    });
  }

  const params = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state: encoded,
    // Force Spotify to show the consent dialog on every connect. Without this,
    // Spotify silently auto-redirects with the user's *prior* scope grant when
    // they've connected before — which means if we ever add a new scope (we
    // recently added playlist-read-collaborative and user-library-read), an
    // existing user clicking "Reconnect" gets a fresh access/refresh token
    // that's *still missing the new scopes*. That manifests as a permanent
    // 403 Forbidden loop on the affected endpoints (e.g. collaborative
    // playlist tracks). Forcing the dialog adds one extra click but
    // guarantees the new scopes are actually granted.
    show_dialog: "true",
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

spotifyRouter.get("/callback", async (req, res, next) => {
  try {
    // If the user clicked "Cancel" on the Spotify consent dialog, Spotify
    // redirects here with ?error=access_denied (no code). Bounce them back
    // to the web app with a friendly hint instead of dumping a 400 JSON.
    const oauthError = typeof req.query.error === "string" ? req.query.error : "";
    if (oauthError) {
      console.warn(`[spotify:callback] oauth denied: ${oauthError}`);
      res.clearCookie("spotify_state", { ...crossSiteCookie });
      res.clearCookie("spotify_return_to", { ...crossSiteCookie });
      return res.redirect(`${env.WEB_ORIGIN}/settings?spotify=denied`);
    }

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
      scope?: string;
    };

    // Log granted scopes so we can verify in Railway logs that the consent
    // actually included the scopes we asked for. Spotify pins scopes to the
    // refresh token at issue time, so if a scope is missing here it'll stay
    // missing for the lifetime of this refresh token — only a fresh consent
    // (show_dialog=true) can fix it.
    const grantedScopes = (tokens.scope ?? "").split(" ").filter(Boolean);
    const requestedScopes = SPOTIFY_SCOPES.split(" ").filter(Boolean);
    const missingScopes = requestedScopes.filter((s) => !grantedScopes.includes(s));
    console.log(
      `[spotify:callback] userId=${userId} granted=[${grantedScopes.join(",")}] missing=[${missingScopes.join(",")}]`,
    );

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

    // Honor the optional same-origin return_to from /connect if we set it.
    // Re-validate here because cookies aren't tamper-proof (they came back
    // from the browser) — same shape checks as on the way in.
    const returnTo = req.cookies?.spotify_return_to;
    res.clearCookie("spotify_return_to", { ...crossSiteCookie });

    let dest = `${env.WEB_ORIGIN}/dashboard?spotify=connected`;
    if (
      typeof returnTo === "string" &&
      returnTo.length < 512 &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.includes("://")
    ) {
      // Append spotify=connected as a hint to the destination page so it can
      // surface a "Spotify reconnected" toast / re-fetch scopes if needed.
      const sep = returnTo.includes("?") ? "&" : "?";
      dest = `${env.WEB_ORIGIN}${returnTo}${sep}spotify=connected`;
    }
    res.redirect(dest);
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
  const tokens = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
  // Log the scope set on every refresh. Spotify pins scopes to the refresh
  // token at issue time — they don't change on subsequent refreshes — so if
  // a user is missing a scope here, the only remedy is for them to fully
  // re-consent (which our /connect now forces via show_dialog=true). Having
  // this log line means we don't need to wait for the next OAuth callback
  // to see what scopes a given user actually has.
  if (tokens.scope) {
    const granted = tokens.scope.split(" ").filter(Boolean);
    const missing = ["playlist-read-collaborative", "user-library-read"].filter(
      (s) => !granted.includes(s),
    );
    if (missing.length > 0) {
      console.warn(
        `[spotify:refresh] userId=${userId} missing scopes=[${missing.join(",")}] — user needs to reconnect`,
      );
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: tokens.access_token,
      spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

// Diagnostic — force a Spotify token refresh and return the actual scope
// set Spotify reports for the user's refresh token. This is the definitive
// way to tell whether a 403 is a scope problem (current token genuinely
// lacks the scope) vs a Spotify-side restriction (the scope is present
// but Spotify still won't serve the resource — e.g. editorial playlists).
//
// Returns: { granted: string[], requested: string[], missing: string[] }
// Hit from the browser at GET /spotify/diagnose while signed in.
spotifyRouter.get("/diagnose", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user?.spotifyRefreshToken) {
      return res.status(409).json({ error: "Spotify not connected" });
    }
    // Force a fresh refresh so Spotify echoes back the current scope set.
    // The cached path in refreshSpotifyTokenForUser would short-circuit if
    // the access token is still valid, so we call Spotify directly here.
    const r = await fetch("https://accounts.spotify.com/api/token", {
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
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.warn(`[spotify:diagnose] refresh failed ${r.status}: ${body}`);
      return res.status(502).json({ error: `Spotify refresh failed: ${r.status}` });
    }
    const tokens = (await r.json()) as { scope?: string };
    const granted = (tokens.scope ?? "").split(" ").filter(Boolean);
    const requested = SPOTIFY_SCOPES.split(" ").filter(Boolean);
    const missing = requested.filter((s) => !granted.includes(s));
    console.log(
      `[spotify:diagnose] userId=${req.user!.sub} granted=[${granted.join(",")}] missing=[${missing.join(",")}]`,
    );
    res.json({ granted, requested, missing });
  } catch (err) {
    next(err);
  }
});

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
