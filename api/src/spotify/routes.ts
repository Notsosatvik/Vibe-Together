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

// Scopes we ask the user to grant on /connect. Trimmed to the *minimum* set
// the app actually exercises — this list is what Spotify's Extension Request
// reviewers cross-check against the feature recording. Every scope here must
// be justifiable; unjustified scopes are the most common rejection reason.
//
//   streaming                       — required to instantiate the Web Playback SDK
//   user-read-email                 — match Spotify account to our user record
//   user-read-private               — read display_name, country, and product tier
//                                     (we gate hosting on product === "premium")
//   user-modify-playback-state      — send play/pause/seek to the user's device;
//                                     this is the core of synchronized listening
//   playlist-read-private           — list the user's own private playlists in
//                                     the "Add from playlist" picker
//   playlist-read-collaborative     — same, for collaborative playlists they
//                                     participate in
//
// Scopes we deliberately do NOT request: user-read-playback-state and
// user-read-currently-playing (we drive playback, we don't poll it),
// user-library-read / user-read-recently-played / user-top-read (no features
// surface those yet).
const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
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
    // they've connected before — which means if we ever change the scope set
    // (e.g. when we added playlist-read-collaborative), an existing user
    // clicking "Reconnect" gets a fresh access/refresh token that's *still
    // missing the new scopes*. That manifests as a permanent 403 Forbidden
    // loop on the affected endpoints. Forcing the dialog adds one extra click
    // but guarantees the new scopes are actually granted.
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
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      console.warn(
        `[spotify:callback] token exchange failed ${tokenRes.status}: ${body.slice(0, 300)}`,
      );
      res.clearCookie("spotify_state", { ...crossSiteCookie });
      res.clearCookie("spotify_return_to", { ...crossSiteCookie });
      return res.redirect(
        `${env.WEB_ORIGIN}/settings?spotify=error&reason=${encodeURIComponent(
          "Spotify rejected the sign-in. Please try Reconnect again.",
        )}`,
      );
    }
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

    // Fetch the Spotify profile — but defensively, because Spotify Dev Mode
    // returns a *plaintext* 403 body (not JSON) for users who aren't on the
    // User Management allowlist. Calling `.json()` directly on that crashes
    // with "Unexpected token 'T', \"The user i\"... is not valid JSON" which
    // would otherwise propagate out as a raw JSON dump on the API host. We
    // read the body as text first, try to parse it, and on any failure
    // redirect back to /settings with a clear error message so the user sees
    // an actionable in-app banner instead of a cryptic JSON page.
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const meBody = await meRes.text().catch(() => "");
    if (!meRes.ok) {
      console.warn(
        `[spotify:callback] /v1/me failed ${meRes.status} for userId=${userId}: ${meBody.slice(0, 400)}`,
      );
      res.clearCookie("spotify_state", { ...crossSiteCookie });
      res.clearCookie("spotify_return_to", { ...crossSiteCookie });
      const looksLikeDevModeBlock =
        meRes.status === 403 &&
        /not registered|developer dashboard|user management/i.test(meBody);
      const friendly = looksLikeDevModeBlock
        ? "Your Spotify account isn't on the beta allowlist yet. Ask the host to add your Spotify email at developer.spotify.com/dashboard → Users and Access, then try again."
        : `Spotify rejected the profile lookup (${meRes.status}). Try Reconnect again, or check that your Spotify account is on the User Management list at developer.spotify.com/dashboard.`;
      return res.redirect(
        `${env.WEB_ORIGIN}/settings?spotify=error&reason=${encodeURIComponent(friendly)}`,
      );
    }
    let profile: { id: string; product: string };
    try {
      profile = JSON.parse(meBody) as { id: string; product: string };
    } catch {
      console.warn(
        `[spotify:callback] /v1/me returned non-JSON body for userId=${userId}: ${meBody.slice(0, 400)}`,
      );
      res.clearCookie("spotify_state", { ...crossSiteCookie });
      res.clearCookie("spotify_return_to", { ...crossSiteCookie });
      return res.redirect(
        `${env.WEB_ORIGIN}/settings?spotify=error&reason=${encodeURIComponent(
          "Spotify returned an unexpected response. Try Reconnect again in a minute.",
        )}`,
      );
    }

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
//
// Pass `force: true` to bypass the "still valid" short-circuit. Use this when
// Spotify's per-token entitlements may have changed even though the token
// hasn't expired — most importantly, when a user upgrades Free → Premium.
// /v1/me will report the new plan immediately, but /me/player/play continues
// returning 403 Premium-required because the *token claims* still say Free
// until we mint a new one from the refresh token.
export async function refreshSpotifyTokenForUser(
  userId: string,
  opts?: { force?: boolean },
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.spotifyRefreshToken) throw new Error("No Spotify refresh token");
  if (
    !opts?.force &&
    user.spotifyTokenExpiry &&
    user.spotifyTokenExpiry > new Date(Date.now() + 60_000)
  ) {
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
    const missing = ["playlist-read-collaborative"].filter(
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
      // Spotify returns 400 invalid_grant when the refresh token has been
      // revoked (user clicked "Remove Access" at spotify.com/account/apps,
      // or signed in to a different Spotify account, etc.). Surface this
      // clearly so the UI can prompt for a reconnect.
      let parsed: { error?: string; error_description?: string } = {};
      try {
        parsed = JSON.parse(body);
      } catch { /* not JSON */ }
      const isRevoked =
        r.status === 400 && parsed.error === "invalid_grant";
      const message = isRevoked
        ? "Your Spotify connection was revoked. Click Reconnect Spotify above to re-authorize."
        : `Spotify refresh failed: ${r.status}${parsed.error_description ? ` (${parsed.error_description})` : ""}`;
      return res.status(isRevoked ? 409 : 502).json({
        error: message,
        revoked: isRevoked,
      });
    }
    const tokens = (await r.json()) as { scope?: string; access_token?: string };
    const granted = (tokens.scope ?? "").split(" ").filter(Boolean);
    const requested = SPOTIFY_SCOPES.split(" ").filter(Boolean);
    const missing = requested.filter((s) => !granted.includes(s));

    // Also fetch /me with the fresh access token so we can return the
    // *actual* email Spotify has on file for this account. The User
    // Management list at developer.spotify.com is matched on this email —
    // if a user adds the wrong email (e.g. their Google email instead of
    // their Spotify email), every API call still 403s in Dev Mode. Showing
    // this directly in the UI eliminates the guesswork.
    let profileEmail: string | null = null;
    let profileId: string | null = null;
    let profileDisplayName: string | null = null;
    let profileCountry: string | null = null;
    if (tokens.access_token) {
      try {
        const meRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (meRes.ok) {
          const me = (await meRes.json()) as {
            id?: string;
            email?: string;
            display_name?: string;
            country?: string;
          };
          profileEmail = me.email ?? null;
          profileId = me.id ?? null;
          profileDisplayName = me.display_name ?? null;
          profileCountry = me.country ?? null;
        } else {
          console.warn(`[spotify:diagnose] /me failed ${meRes.status}`);
        }
      } catch (e) {
        console.warn(`[spotify:diagnose] /me threw: ${(e as Error).message}`);
      }
    }

    console.log(
      `[spotify:diagnose] userId=${req.user!.sub} spotifyId=${profileId} ` +
        `email=${profileEmail} granted=[${granted.join(",")}] missing=[${missing.join(",")}]`,
    );
    res.json({
      granted,
      requested,
      missing,
      profile: {
        id: profileId,
        email: profileEmail,
        display_name: profileDisplayName,
        country: profileCountry,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Hand the user's current Spotify access token to the Web Playback SDK.
// Refreshes the token first if it's about to expire. Premium-only — free
// users can still call this; the SDK just won't initialize for them.
//
// Self-healing product re-check: spotifyProduct is captured ONCE during
// OAuth connect and otherwise never updated. If a user upgrades from Free
// to Premium *after* connecting (very common — they discover the room
// requires Premium, click upgrade on spotify.com, then come back), our DB
// still says "free" forever and the SDK never initializes. So whenever the
// cached value isn't already "premium" we make one fresh /v1/me call and
// write back. Once we see Premium we stop polling — Premium-to-Free
// downgrades are rare enough that a manual Reconnect handles them.
spotifyRouter.get("/token", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user?.spotifyRefreshToken) {
      return res.status(409).json({ error: "Spotify not connected" });
    }
    // The client passes ?force=1 when it just hit a 403 PREMIUM_REQUIRED on a
    // playback API call. That error means Spotify's playback service is
    // reading stale plan claims off the access token (most commonly: the
    // user upgraded to Premium *after* we minted this token, and the token's
    // baked-in plan still says Free even though /v1/me reports Premium).
    // Force-refresh mints a brand-new token with fresh claims.
    const force = req.query.force === "1" || req.query.force === "true";
    let token = await refreshSpotifyTokenForUser(req.user!.sub, { force });
    if (force) {
      console.info(
        `[spotify:token] force-refresh requested by client for ${req.user!.sub}`,
      );
    }

    let product = user.spotifyProduct;
    if (product !== "premium") {
      try {
        const meRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = (await meRes.json()) as { product?: string | null };
          const fresh = me.product ?? null;
          if (fresh && fresh !== product) {
            console.info(
              `[spotify:token] product changed for ${req.user!.sub}: ${product} → ${fresh}`,
            );
            await prisma.user.update({
              where: { id: req.user!.sub },
              data: { spotifyProduct: fresh },
            });
            product = fresh;

            // CRITICAL: when product flips to premium we must also mint a
            // brand-new access token from the refresh token. Spotify pins
            // the user's plan into the access token's claims at issue
            // time — so the token we just used for /v1/me (which reads
            // the live profile) still says "free" at the playback layer,
            // and /me/player/play would keep returning 403 Premium
            // required until the token's natural ~1h expiry. Forcing a
            // refresh now gets the SDK a token with the updated
            // entitlements on the very next call.
            if (fresh === "premium") {
              try {
                token = await refreshSpotifyTokenForUser(req.user!.sub, {
                  force: true,
                });
                console.info(
                  `[spotify:token] minted fresh token after Free → Premium upgrade for ${req.user!.sub}`,
                );
              } catch (e) {
                console.warn(
                  `[spotify:token] force-refresh after upgrade failed: ${(e as Error).message}`,
                );
              }
            }
          }
        } else {
          // Don't fail the token request just because the product check
          // hit a transient — the SDK will catch up next tick.
          console.warn(
            `[spotify:token] /v1/me product check failed ${meRes.status}; keeping cached "${product}"`,
          );
        }
      } catch (e) {
        console.warn(
          `[spotify:token] /v1/me product check threw: ${(e as Error).message}`,
        );
      }
    }

    // Re-read so expires_in_ms reflects any force-refresh above.
    const refreshed = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { spotifyTokenExpiry: true },
    });
    const expiresInMs =
      refreshed?.spotifyTokenExpiry && refreshed.spotifyTokenExpiry > new Date()
        ? refreshed.spotifyTokenExpiry.getTime() - Date.now()
        : 3500_000;
    res.json({
      access_token: token,
      product,
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

    // Feb 2026 migration: search `limit` max was reduced from 50/default 20
    // to 10/default 5. Asking for 20 now returns a 400 Bad Request.
    const r = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(q)}`,
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

// Playlist items proxy — moved server-side so we get full diagnostic logging
// when Spotify returns errors. The browser-side version was hiding crucial
// detail (WWW-Authenticate headers, full error body) and CORS was eating
// some response info.
//
// Feb 2026 Spotify Web API migration: the old GET /v1/playlists/{id}/tracks
// endpoint was REMOVED and replaced with GET /v1/playlists/{id}/items. The
// old path returns 403 Forbidden (not 404 — Spotify's choice, confusingly)
// for Dev Mode apps that haven't migrated. The response shape also changed:
//   old:  { items: [{ track: {...} }] }
//   new:  { items: [{ item:  {...} }] }
// Playlist metadata's `tracks` field was likewise renamed to `items`, so
// fields=tracks(total) → fields=items(total).
//
// We keep our outward-facing path /spotify/playlists/:id/tracks and the
// {track:...} response shape so the frontend hook doesn't need changes —
// just rewrite the upstream call and unwrap items[].item → items[].track
// on the way back.
//
// Refs:
//   https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
//   https://developer.spotify.com/documentation/web-api/references/changes/february-2026
spotifyRouter.get("/playlists/:id/tracks", requireAuth, async (req, res, next) => {
  try {
    const playlistId = String(req.params.id);
    if (!playlistId || playlistId.length > 64) {
      return res.status(400).json({ error: "Invalid playlist id" });
    }

    // Pull the user's Spotify ID up front so we can compare with the
    // playlist owner. Spotify user IDs are often opaque random strings
    // for SSO accounts, so the "is this mine?" check must be exact.
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { spotifyId: true },
    });
    const mySpotifyId = user?.spotifyId ?? null;

    const token = await refreshSpotifyTokenForUser(req.user!.sub).catch((e) => {
      console.warn("[spotify:playlist-items] token refresh failed:", (e as Error).message);
      throw new Error("Spotify not connected. Reconnect from your account page.");
    });

    // Playlist metadata (post-Feb-2026 field names — `items.total` instead
    // of `tracks.total`). Spotify returns null items only for playlists the
    // user owns/collaborates on, otherwise the playlist itself still 200s.
    const metaUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=id,name,owner(id,display_name),public,collaborative,items(total)`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let ownerId: string | null = null;
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as {
        owner?: { id?: string; display_name?: string };
        name?: string;
        public?: boolean;
        collaborative?: boolean;
        items?: { total?: number };
      };
      ownerId = meta.owner?.id ?? null;
      console.log(
        `[spotify:playlist-items] playlistId=${playlistId} name="${meta.name}" owner=${ownerId} ` +
          `displayName="${meta.owner?.display_name ?? ""}" public=${meta.public} ` +
          `collaborative=${meta.collaborative} total=${meta.items?.total ?? "?"}`,
      );
    } else {
      const metaBody = await metaRes.text().catch(() => "");
      const metaAuth = metaRes.headers.get("www-authenticate") ?? "";
      console.warn(
        `[spotify:playlist-items] meta ${metaRes.status} ${playlistId}` +
          (metaAuth ? ` www-authenticate="${metaAuth}"` : "") +
          ` body=${metaBody.slice(0, 300)}`,
      );
    }

    // NEW endpoint + NEW field selector. The wrapper key is `item`, not
    // `track`. We translate back to `track` below before responding so the
    // frontend doesn't have to know about the migration.
    const itemsUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=100&fields=items(item(uri,name,duration_ms,artists(name),album(name,images)))`;
    const itemsRes = await fetch(itemsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!itemsRes.ok) {
      const body = await itemsRes.text().catch(() => "");
      const wwwAuth = itemsRes.headers.get("www-authenticate") ?? "";
      console.warn(
        `[spotify:playlist-items] items ${itemsRes.status} ${playlistId} owner=${ownerId}` +
          (wwwAuth ? ` www-authenticate="${wwwAuth}"` : "") +
          ` body=${body.slice(0, 500)}`,
      );
      let parsedMessage = `Spotify returned ${itemsRes.status}`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed?.error?.message) parsedMessage = `Spotify: ${parsed.error.message}`;
      } catch { /* not JSON */ }
      const ownedByMe = ownerId && mySpotifyId && ownerId === mySpotifyId;
      const friendly =
        itemsRes.status === 401
          ? "Spotify token expired. Reconnect from settings."
          : itemsRes.status === 403 && ownerId === "spotify"
          ? "This is a Spotify editorial playlist. Dev Mode apps no longer have access to Spotify-owned playlists. Try one of your own."
          : itemsRes.status === 403 && !ownedByMe
          ? `You don't own this playlist (owner: "${ownerId ?? "unknown"}"). Spotify only returns contents for playlists you own or collaborate on. Try one of your own.`
          : parsedMessage;
      console.warn(
        `[spotify:playlist-items] ${itemsRes.status} mine=${mySpotifyId} owner=${ownerId} ownedByMe=${ownedByMe}`,
      );
      return res
        .status(itemsRes.status === 401 ? 401 : 502)
        .json({
          error: friendly,
          ownerId,
          mySpotifyId,
          ownedByMe,
          upstream_status: itemsRes.status,
        });
    }

    // Translate Feb-2026 shape `{ items: [{ item: {...} }] }` back to the
    // legacy `{ items: [{ track: {...} }] }` the frontend already handles.
    const raw = (await itemsRes.json()) as {
      items?: Array<{ item?: unknown; track?: unknown }>;
    };
    const translated = {
      items: (raw.items ?? []).map((row) => ({
        // Some clients/regions may still return `track` for a transition
        // period — accept either, prefer `item` (the new field).
        track: row.item ?? row.track ?? null,
      })),
    };
    console.log(
      `[spotify:playlist-items] OK playlistId=${playlistId} → ${translated.items.length} items`,
    );
    res.json(translated);
  } catch (err) {
    next(err);
  }
});
