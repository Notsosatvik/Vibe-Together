import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../lib/jwt.js";

export const authRouter = Router();

// =========================================
// Google OAuth — sign in
// =========================================
//
// Flow:
//   1. GET /auth/google → 302 to Google's consent screen
//   2. Google redirects → GET /auth/google/callback?code=...
//   3. Exchange code → user info → upsert User → set HttpOnly cookies → 302 to web app
//
// In production the API (railway.app) and web (vercel.app) are different sites,
// so cookies need SameSite=None;Secure to be sent on cross-site fetch.
const isProd = env.NODE_ENV === "production";
const crossSiteCookie = {
  httpOnly: true as const,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  secure: isProd,
  path: "/",
};

authRouter.get("/google", (req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: "Google OAuth not configured" });
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, { ...crossSiteCookie, maxAge: 5 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get("/google/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    if (!code || state !== req.cookies?.oauth_state) {
      return res.status(400).json({ error: "Invalid OAuth state" });
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_REDIRECT_URI!,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("Google token exchange failed");
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = (await userInfoRes.json()) as {
      sub: string;
      email: string;
      name: string;
      picture?: string;
    };

    // Upsert user
    const baseHandle = profile.email.split("@")[0]!.replace(/[^a-z0-9_]/gi, "").toLowerCase();
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        googleId: profile.sub,
        name: profile.name,
        avatarUrl: profile.picture,
        lastSeenAt: new Date(),
      },
      create: {
        email: profile.email,
        googleId: profile.sub,
        name: profile.name,
        avatarUrl: profile.picture,
        handle: `${baseHandle}_${crypto.randomBytes(2).toString("hex")}`,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      handle: user.handle,
    });
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("access_token", accessToken, { ...crossSiteCookie, maxAge: 15 * 60 * 1000 });
    res.cookie("refresh_token", refreshToken, { ...crossSiteCookie, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.clearCookie("oauth_state", { ...crossSiteCookie });

    // If user hasn't connected Spotify, send them to onboarding
    const dest = user.spotifyId ? "/dashboard" : "/onboarding";
    // Also pass tokens via URL fragment as a fallback for browsers that
    // block third-party cookies (Safari ITP, Brave, Chrome Incognito, etc.).
    // Fragments are NOT sent to the server. The web app reads & strips them
    // on mount, stores in localStorage, and sends as Authorization header.
    const fragment = new URLSearchParams({ a: accessToken, r: refreshToken }).toString();
    res.redirect(`${env.WEB_ORIGIN}${dest}#${fragment}`);
  } catch (err) {
    next(err);
  }
});

// =========================================
// Refresh token rotation
// =========================================
authRouter.post("/refresh", async (req, res, next) => {
  try {
    // Accept refresh token from cookie OR body (cross-site cookie fallback).
    const bodyToken =
      req.body && typeof req.body === "object" && typeof (req.body as { refresh_token?: unknown }).refresh_token === "string"
        ? ((req.body as { refresh_token: string }).refresh_token)
        : "";
    const token = (req.cookies?.refresh_token as string | undefined) ?? bodyToken ?? "";
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const claims = verifyRefreshToken(token);
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const stored = await prisma.refreshToken.findUnique({ where: { hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: "Refresh token invalid" });
    }

    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });

    // Rotate
    await prisma.refreshToken.update({ where: { hash }, data: { revokedAt: new Date() } });
    const newRefresh = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hash: crypto.createHash("sha256").update(newRefresh).digest("hex"),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const access = signAccessToken({
      sub: user.id,
      email: user.email,
      handle: user.handle,
    });

    res.cookie("access_token", access, { ...crossSiteCookie, maxAge: 15 * 60 * 1000 });
    res.cookie("refresh_token", newRefresh, { ...crossSiteCookie, maxAge: 30 * 24 * 60 * 60 * 1000 });

    // Also return tokens in the body so callers using the header-based fallback
    // (no third-party cookies) can keep them in localStorage.
    res.json({ ok: true, access_token: access, refresh_token: newRefresh });
  } catch (err) {
    next(err);
  }
});

// =========================================
// One-time auth ticket — for top-level navigations that can't send Authorization
// headers (e.g. /spotify/connect). Frontend mints a ticket via this endpoint
// (using its Bearer token), then navigates to /spotify/connect?ticket=<t>.
// Tickets are short-lived JWTs signed with the access secret.
// =========================================
authRouter.post("/ticket", (req, res) => {
  try {
    const header = req.headers.authorization;
    const cookieToken = (req.cookies?.access_token as string | undefined) ?? "";
    const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    // Verify the user's access token, then mint a 60-second ticket containing
    // just the user id. The ticket is single-use logically (short TTL only).
    const claims = verifyAccessToken(token);
    const ticket = jwt.sign(
      { sub: claims.sub, kind: "ticket" },
      env.JWT_SECRET,
      { expiresIn: 60 } as { expiresIn: number }
    );
    res.json({ ticket });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

authRouter.post("/logout", async (req, res) => {
  const token = (req.cookies?.refresh_token as string | undefined) ?? "";
  if (token) {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.refreshToken
      .update({ where: { hash }, data: { revokedAt: new Date() } })
      .catch(() => {});
  }
  res.clearCookie("access_token", { ...crossSiteCookie });
  res.clearCookie("refresh_token", { ...crossSiteCookie });
  res.json({ ok: true });
});
