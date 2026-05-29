import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

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
  "playlist-read-private",
  "user-read-recently-played",
  "user-top-read",
].join(" ");

// Kick off Spotify OAuth — user is already signed in with Google.
spotifyRouter.get("/connect", requireAuth, (req, res) => {
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

// Search proxy — frontend hits this to find tracks for the queue.
spotifyRouter.get("/search", requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").slice(0, 200);
    if (!q) return res.json({ tracks: [] });
    const token = await refreshSpotifyTokenForUser(req.user!.sub);
    const r = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=20&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
