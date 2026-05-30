"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

// Minimal Web Playback SDK surface — we don't pull in the full @types/spotify-web-playback-sdk
// dependency just for a handful of fields.
type SpotifyPlayerLike = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  togglePlay: () => Promise<void>;
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

export function useSpotifyPlayer(enabled: boolean) {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayerLike | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        // Fetch initial token + product info. /spotify/token refreshes if needed.
        const { access_token, product } = await apiFetch<{
          access_token: string;
          product: string | null;
        }>("/spotify/token");

        if (cancelled) return;
        if (product !== "premium") {
          setStatus("no-premium");
          setError("Spotify Premium required to play full tracks.");
          return;
        }
        tokenRef.current = access_token;

        await loadSdk();
        if (cancelled) return;
        if (!window.Spotify) throw new Error("Spotify SDK didn't load");

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
              .catch(() => {
                if (tokenRef.current) cb(tokenRef.current);
              });
          },
        });

        player.addListener("ready", (data) => {
          const d = data as { device_id: string };
          if (cancelled) return;
          setDeviceId(d.device_id);
          setStatus("ready");
        });
        player.addListener("not_ready", () => {
          // Device went offline (tab backgrounded too long, etc.)
        });
        player.addListener("initialization_error", (data) => {
          const d = data as { message?: string };
          setError(d.message ?? "Init error");
          setStatus("error");
        });
        player.addListener("authentication_error", (data) => {
          const d = data as { message?: string };
          setError(d.message ?? "Auth error");
          setStatus("error");
        });
        player.addListener("account_error", () => {
          setStatus("no-premium");
          setError("Spotify Premium required.");
        });
        player.addListener("playback_error", (data) => {
          // Non-fatal — log only.
          console.warn("Spotify playback error", data);
        });

        const connected = await player.connect();
        if (!connected) throw new Error("Couldn't connect to Spotify");
        playerRef.current = player;
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError((e as Error).message ?? "Spotify SDK error");
      }
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [enabled]);

  return { status, deviceId, error };
}

/**
 * Tell Spotify to play a specific track URI on the user's Web Playback device,
 * starting at the given position. Uses the user's access token directly via
 * /me/player/play — the SDK doesn't expose a clean play(uri) call.
 */
export async function playTrackOnDevice(
  deviceId: string,
  trackUri: string,
  positionMs: number
) {
  const { access_token } = await apiFetch<{ access_token: string }>(
    "/spotify/token"
  );
  await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [trackUri],
        position_ms: Math.max(0, Math.floor(positionMs)),
      }),
    }
  );
}

export async function pausePlayback(deviceId: string) {
  const { access_token } = await apiFetch<{ access_token: string }>(
    "/spotify/token"
  );
  await fetch(
    `https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${access_token}` } }
  );
}

export async function seekPlayback(deviceId: string, positionMs: number) {
  const { access_token } = await apiFetch<{ access_token: string }>(
    "/spotify/token"
  );
  await fetch(
    `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(
      positionMs
    )}&device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${access_token}` } }
  );
}
