"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

// Minimal Web Playback SDK surface — we don't pull in the full @types/spotify-web-playback-sdk
// dependency just for a handful of fields.
type SpotifyPlayerState = {
  position: number;
  duration: number;
  paused: boolean;
  track_window?: {
    current_track?: { uri?: string } | null;
    previous_tracks?: { uri?: string | null }[];
  };
};

type SpotifyPlayerLike = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  togglePlay: () => Promise<void>;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  // Spotify-provided escape hatch from the browser autoplay policy. The SDK
  // internally creates an <audio> element on `connect()`, and most browsers
  // refuse to start that element's playback until they've seen a real user
  // gesture in the page. activateElement() does that priming for us — but
  // it MUST be called from inside a click/tap/keydown handler. Calling it
  // from a useEffect or microtask is a no-op.
  // Returns a promise that resolves once the element is playable.
  activateElement?: () => Promise<void>;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerLike;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
let sdkLoadPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Spotify) return resolve();

    window.onSpotifyWebPlaybackSDKReady = () => resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`
    );
    if (existing) return; // SDK loads asynchronously; the callback fires when ready

    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Spotify SDK"));
    document.head.appendChild(s);
  });
  return sdkLoadPromise;
}

type PlayerStatus = "idle" | "loading" | "ready" | "no-premium" | "error";

export type UseSpotifyPlayerOptions = {
  /**
   * Fired when the Web Playback SDK reports a track finished playing on its
   * own (as opposed to being paused or skipped by the user). The argument is
   * the URI of the track that just ended.
   *
   * The detection is conservative — see the `player_state_changed` listener
   * for the exact heuristic. Callers should still race-guard inside the
   * callback (e.g. compare against the latest known playback.trackUri) to
   * avoid double-advancing when manual skips and natural ends overlap.
   */
  onTrackEnded?: (endedTrackUri: string) => void;
};

export function useSpotifyPlayer(
  enabled: boolean,
  opts?: UseSpotifyPlayerOptions,
) {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayerLike | null>(null);
  const tokenRef = useRef<string | null>(null);
  // Mirror of `status` for use inside setTimeout/event handlers where we
  // don't want to depend on a possibly-stale closure.
  const statusRef = useRef<PlayerStatus>("idle");

  // Stash the latest onTrackEnded in a ref so the player listener (which is
  // attached once during setup) always invokes the freshest callback —
  // otherwise we'd have to tear down + reconnect the SDK every time the
  // parent component re-rendered with a new closure.
  const onTrackEndedRef = useRef(opts?.onTrackEnded);
  useEffect(() => {
    onTrackEndedRef.current = opts?.onTrackEnded;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    statusRef.current = "loading";
    setStatus("loading");
    setError(null);

    const applyStatus = (next: PlayerStatus, err?: string | null) => {
      statusRef.current = next;
      setStatus(next);
      if (err !== undefined) setError(err);
    };

    // Hard ceiling: if we haven't flipped to ready / no-premium / error within
    // 15 seconds, surface a timeout so the user isn't left staring at a spinner.
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      if (statusRef.current === "loading") {
        applyStatus(
          "error",
          "Spotify took too long to start. This usually means an ad-blocker or extension is blocking sdk.scdn.co — try a different browser or disable extensions for this tab."
        );
      }
    }, 15000);

    (async () => {
      try {
        console.info("[spotify-player] fetching /spotify/token …");
        // Fetch initial token + product info. /spotify/token refreshes if needed.
        const { access_token, product } = await apiFetch<{
          access_token: string;
          product: string | null;
        }>("/spotify/token");

        if (cancelled) return;
        console.info("[spotify-player] got token, product =", product);
        if (product !== "premium") {
          applyStatus("no-premium", "Spotify Premium required to play full tracks.");
          return;
        }
        tokenRef.current = access_token;

        console.info("[spotify-player] loading SDK script …");
        await loadSdk();
        if (cancelled) return;
        if (!window.Spotify) throw new Error("Spotify SDK didn't load");
        console.info("[spotify-player] SDK loaded, creating Player");

        const player = new window.Spotify.Player({
          name: "VibeTogether",
          volume: 0.7,
          getOAuthToken: (cb) => {
            // Spotify will call this whenever it needs a fresh token.
            void apiFetch<{ access_token: string }>("/spotify/token")
              .then((t) => {
                tokenRef.current = t.access_token;
                cb(t.access_token);
              })
              .catch((err) => {
                console.warn("[spotify-player] token refresh failed", err);
                if (tokenRef.current) cb(tokenRef.current);
              });
          },
        });

        player.addListener("ready", (data) => {
          const d = data as { device_id: string };
          if (cancelled) return;
          console.info("[spotify-player] ready, device_id =", d.device_id);
          setDeviceId(d.device_id);
          applyStatus("ready", null);
        });
        player.addListener("not_ready", (data) => {
          console.warn("[spotify-player] not_ready", data);
        });
        player.addListener("initialization_error", (data) => {
          const d = data as { message?: string };
          console.error("[spotify-player] initialization_error", d);
          applyStatus("error", d.message ?? "Init error");
        });
        player.addListener("authentication_error", (data) => {
          const d = data as { message?: string };
          console.error("[spotify-player] authentication_error", d);
          applyStatus(
            "error",
            d.message ??
              "Spotify rejected the access token. Try disconnecting and reconnecting Spotify from your account page."
          );
        });
        player.addListener("account_error", (data) => {
          console.error("[spotify-player] account_error", data);
          applyStatus("no-premium", "Spotify Premium required.");
        });
        player.addListener("playback_error", (data) => {
          // Non-fatal — log only.
          console.warn("[spotify-player] playback_error", data);
        });

        // -----------------------------------------------------------------
        // Natural end-of-track detection.
        // -----------------------------------------------------------------
        // Spotify doesn't fire a dedicated "ended" event. Instead, when a
        // track finishes on its own, `player_state_changed` fires with:
        //   - paused: true
        //   - position: 0
        //   - track_window.previous_tracks[0]: <the track that just ended>
        //
        // This pattern is identical to the one Spotify uses in its own
        // documented "detect track end" examples. We add two extra guards
        // to avoid false positives:
        //   1. We track whether the previously-seen state was actually
        //      mid-track (playing, position > 1s). The SDK briefly shows
        //      paused/position=0 right after a play command is issued
        //      *before* audio actually starts; without this guard we'd
        //      auto-advance off our own brand-new track.
        //   2. The "ended" track URI must appear in previous_tracks of the
        //      new state. This filters out the equivalent "we just paused
        //      a fresh track" transient.
        let lastObserved: { trackUri: string | null; wasMidTrack: boolean } = {
          trackUri: null,
          wasMidTrack: false,
        };
        player.addListener("player_state_changed", (raw) => {
          const s = raw as SpotifyPlayerState | null;
          if (!s) return;
          const currentUri = s.track_window?.current_track?.uri ?? null;
          const position = s.position ?? 0;
          const duration = s.duration ?? 0;
          const paused = s.paused ?? false;

          const endedUri = lastObserved.trackUri;
          if (
            endedUri &&
            lastObserved.wasMidTrack &&
            paused &&
            position === 0 &&
            duration > 0 &&
            (s.track_window?.previous_tracks ?? []).some(
              (t) => t?.uri === endedUri,
            )
          ) {
            console.info(
              "[spotify-player] detected natural track end:",
              endedUri,
            );
            try {
              onTrackEndedRef.current?.(endedUri);
            } catch (err) {
              console.warn(
                "[spotify-player] onTrackEnded callback threw",
                err,
              );
            }
          }

          lastObserved = {
            trackUri: currentUri,
            // Only arm the "was playing" flag once audio is actually past
            // the 1s mark — see comment block above.
            wasMidTrack: !paused && position > 1000,
          };
        });

        console.info("[spotify-player] connecting …");
        const connected = await player.connect();
        console.info("[spotify-player] player.connect() returned", connected);
        if (!connected) throw new Error("Couldn't connect to Spotify");
        playerRef.current = player;
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error).message ?? "Spotify SDK error";
        console.error("[spotify-player] setup failed:", msg, e);
        // Common case: user landed on the room before completing the Spotify
        // OAuth — make the path forward obvious.
        if (/spotify.+not.+connected/i.test(msg) || /409/.test(msg)) {
          applyStatus(
            "error",
            "Your Spotify account isn't connected yet. Open your account page and click \"Connect Spotify\"."
          );
        } else {
          applyStatus("error", msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [enabled]);

  // Stable function reference so callers can put it in an effect's deps array
  // without retriggering every render. Reads through to the latest player.
  const getCurrentState = useCallback(async (): Promise<SpotifyPlayerState | null> => {
    if (!playerRef.current) return null;
    try {
      return await playerRef.current.getCurrentState();
    } catch (e) {
      console.warn("[spotify-player] getCurrentState threw:", e);
      return null;
    }
  }, []);

  // MUST be invoked from inside a user gesture (click/tap/keydown handler).
  // Resolves once the SDK's internal <audio> element is allowed to play.
  // Returns false if the SDK doesn't expose activateElement (older builds)
  // or if the player isn't connected yet — in either case the caller should
  // still attempt playback; older builds typically auto-activate on play.
  const activate = useCallback(async (): Promise<boolean> => {
    const p = playerRef.current;
    if (!p) return false;
    if (typeof p.activateElement !== "function") return false;
    try {
      await p.activateElement();
      console.info("[spotify-player] activateElement() succeeded");
      return true;
    } catch (e) {
      console.warn("[spotify-player] activateElement() threw:", e);
      return false;
    }
  }, []);

  return { status, deviceId, error, getCurrentState, activate };
}

/**
 * Tell Spotify to play a specific track URI on the user's Web Playback device,
 * starting at the given position. Uses the user's access token directly via
 * /me/player/play — the SDK doesn't expose a clean play(uri) call.
 *
 * Failure modes worth knowing about (we surface these as SpotifyApiError so
 * the UI can show a banner instead of silently muting the listener):
 *   - 401 → token expired; the SDK will trigger getOAuthToken on the next
 *     attempt, so a single retry from the caller usually clears this.
 *   - 403 PREMIUM_REQUIRED → the account isn't actually Premium even though
 *     /spotify/token said it was (rare; usually a family-plan child account).
 *   - 403 Restricted device → SDK device exists but Spotify won't route
 *     audio to it (region/account restriction, ad-blocker, weird browser).
 *   - 404 NO_ACTIVE_DEVICE → SDK reported "ready" but Spotify hasn't
 *     finished registering the device yet. Auto-retries once after ~500ms
 *     because this is by far the most common transient on listener load.
 *   - 502 Player command failed → Spotify backend hiccup. One retry.
 *
 * Returns void on success. Throws SpotifyApiError on permanent failure.
 */
export async function playTrackOnDevice(
  deviceId: string,
  trackUri: string,
  positionMs: number,
) {
  const url = `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`;
  const body = JSON.stringify({
    uris: [trackUri],
    position_ms: Math.max(0, Math.floor(positionMs)),
  });

  const attempt = async (forceRefresh = false) => {
    const { access_token } = await apiFetch<{ access_token: string }>(
      forceRefresh ? "/spotify/token?force=1" : "/spotify/token",
    );
    return fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body,
    });
  };

  let r = await attempt();
  // 404 (NO_ACTIVE_DEVICE) and 502 are commonly transient when the SDK has
  // just announced "ready" — Spotify's device registry lags slightly behind
  // the SDK's local "ready" event. One retry with a short delay clears the
  // vast majority of cases.
  if (r.status === 404 || r.status === 502) {
    console.warn(
      `[spotify-cmd] play got ${r.status}, retrying once after 600ms`,
    );
    await new Promise((res) => setTimeout(res, 600));
    r = await attempt();
  }
  // 403 PREMIUM_REQUIRED most often means the user upgraded to Premium AFTER
  // their current access token was minted — Spotify pins the plan tier into
  // the token's claims, so the playback service still sees "free" even
  // though /v1/me reports "premium". Force-refresh once via the server's
  // ?force=1 path (which bypasses the "still valid" short-circuit and hits
  // POST /api/token with the refresh_token) and retry. The new token's
  // claims pick up the upgraded plan.
  if (r.status === 403) {
    const peek = await r.clone().text().catch(() => "");
    if (/premium.*required|player command failed/i.test(peek)) {
      console.warn(
        "[spotify-cmd] play got 403 PREMIUM_REQUIRED — force-refreshing token and retrying once",
      );
      r = await attempt(true);
    }
  }
  if (!r.ok) throw await formatSpotifyError(r);
}

export async function pausePlayback(deviceId: string) {
  const { access_token } = await apiFetch<{ access_token: string }>(
    "/spotify/token",
  );
  const r = await fetch(
    `https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${access_token}` } },
  );
  // 403 here is benign — "already paused" returns 403 with Restriction
  // violated. Don't throw on that; it'd spam the UI for nothing.
  if (!r.ok && r.status !== 403) throw await formatSpotifyError(r);
}

export async function seekPlayback(deviceId: string, positionMs: number) {
  const { access_token } = await apiFetch<{ access_token: string }>(
    "/spotify/token",
  );
  const r = await fetch(
    `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(
      positionMs,
    )}&device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${access_token}` } },
  );
  if (!r.ok) throw await formatSpotifyError(r);
}

export type SpotifyTrack = {
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: { url: string }[]; name: string };
};

/**
 * Search Spotify tracks DIRECTLY from the browser using the SDK token.
 *
 * Why client-side? Our server-side proxy at /spotify/search was getting
 * intermittent 400s from Spotify (most likely Spotify rejecting Railway's
 * outbound requests by user-agent or IP class). The Web Playback SDK token
 * is the same one we'd use server-side and it's already proven valid in
 * this tab (it's what's driving audio playback), so calling Spotify
 * directly from the client both (a) removes the failing hop entirely and
 * (b) gives us the verbatim Spotify error if anything still goes wrong.
 */
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  const { access_token } = await apiFetch<{ access_token: string }>("/spotify/token");
  const url = `https://api.spotify.com/v1/search?type=track&limit=20&q=${encodeURIComponent(
    query,
  )}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
    },
  });
  if (!r.ok) throw await formatSpotifyError(r);
  const data = (await r.json()) as { tracks?: { items?: SpotifyTrack[] } };
  return data.tracks?.items ?? [];
}

export type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  // owner.id is the canonical owner; "spotify" for editorial playlists,
  // a username for user-owned ones. display_name is for showing only.
  owner: { id: string; display_name: string | null };
};

/**
 * List the signed-in user's Spotify playlists (the ones they own *or* follow).
 * Direct browser call — same rationale as searchSpotifyTracks above.
 *
 * Requires the `playlist-read-private` scope, which we already request
 * during the Spotify OAuth flow.
 */
export async function getMyPlaylists(): Promise<SpotifyPlaylist[]> {
  const { access_token } = await apiFetch<{ access_token: string }>("/spotify/token");
  // 50 is Spotify's max page size — enough for an MVP. Paginate later if
  // we hit users with hundreds of playlists.
  const r = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
    },
  });
  if (!r.ok) throw await formatSpotifyError(r);
  const data = (await r.json()) as { items?: SpotifyPlaylist[] };
  return data.items ?? [];
}

/**
 * Fetch the tracks inside a playlist. We use `fields` to keep the response
 * shape tiny and predictable — Spotify's full playlist-track object is huge
 * (audio features, available markets, link relations…) and we only need the
 * five fields that drive the queue row UI.
 *
 * Non-track items (podcasts, region-blocked, deleted) come back as `null`
 * inside the `items` array — we filter those out so callers always get a
 * clean SpotifyTrack[].
 */
export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  // Routed through our API now — the server-side proxy logs the full
  // Spotify response (including WWW-Authenticate headers) on failure so
  // we can diagnose opaque 403s in Railway logs. It also fetches playlist
  // metadata to know whether the owner is "spotify" (editorial playlist,
  // hit by the Nov 2024 Web API deprecation for new apps).
  //
  // Throws an ApiError with .status set, which the UI's existing
  // isAuthLikeError check still pattern-matches against for the
  // "Reconnect Spotify" CTA.
  try {
    const data = await apiFetch<{
      items?: { track: SpotifyTrack | null }[];
    }>(`/spotify/playlists/${encodeURIComponent(playlistId)}/tracks`);
    return (data.items ?? [])
      .map((i) => i.track)
      .filter((t): t is SpotifyTrack => !!t && !!t.uri);
  } catch (e) {
    // Repackage ApiError → SpotifyApiError so existing isAuthLikeError() checks
    // (which test `instanceof SpotifyApiError`) keep working in the UI.
    const apiErr = e as { status?: number; message?: string };
    throw new SpotifyApiError(
      apiErr.message ?? "Failed to load playlist tracks",
      apiErr.status ?? 0,
    );
  }
}

/**
 * Custom error class for Spotify API failures. Carries the HTTP status so
 * UI code can pattern-match on it (e.g. 403 → "Reconnect Spotify" CTA)
 * instead of regex-matching the message string.
 */
export class SpotifyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
}

// Spotify wraps errors as { error: { status, message } }. Pull the
// human-readable bit out so the UI doesn't show raw JSON.
//
// Also dumps the full request URL + status + body + select headers to the
// browser console so we can diagnose what Spotify is actually objecting to
// when the human-readable error string is unhelpful (e.g. plain "Forbidden"
// on a 403 we can't otherwise explain).
async function formatSpotifyError(r: Response): Promise<SpotifyApiError> {
  const body = await r.text().catch(() => "");
  // WWW-Authenticate often carries the *real* reason on 401/403 — for
  // example, error="insufficient_scope" and the required scope list.
  const wwwAuth = r.headers.get("www-authenticate") ?? "";
  console.warn(
    `[spotify-error] ${r.status} ${r.url}` +
      (wwwAuth ? `\n  www-authenticate: ${wwwAuth}` : "") +
      `\n  body: ${body.slice(0, 500)}`,
  );
  let message = `Spotify returned ${r.status}`;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed?.error?.message) message = `Spotify: ${parsed.error.message}`;
  } catch {
    if (body) message = `Spotify ${r.status}: ${body.slice(0, 160)}`;
  }
  return new SpotifyApiError(message, r.status);
}
