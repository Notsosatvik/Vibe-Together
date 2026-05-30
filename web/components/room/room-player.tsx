"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Volume2, Wifi, WifiOff } from "lucide-react";
import {
  useSpotifyPlayer,
  playTrackOnDevice,
  pausePlayback,
  seekPlayback,
} from "@/lib/hooks/use-spotify-player";
import { getSocket, computeTargetPosition, type PlaybackState, type QueueItemDTO, type RoomStateDTO } from "@/lib/socket";
import { SearchPanel } from "./search-panel";
import { NowPlaying, QueueList } from "./now-playing";

type SocketStatus =
  | { kind: "connecting" }
  | { kind: "joined" }
  | { kind: "error"; message: string };

/**
 * Owns the entire room playback experience for a logged-in, Spotify-connected user.
 *
 * Responsibilities:
 *   1. Connect to the Socket.IO room (single source of truth for state)
 *   2. Initialize the Spotify Web Playback SDK in this tab (Premium only)
 *   3. Mirror the host's playback in this user's local Spotify player
 *   4. Let the host search/queue/play/pause/skip
 */
export function RoomPlayer({
  roomId,
  isHost,
  initialPlayback,
  initialQueue,
}: {
  roomId: string;
  isHost: boolean;
  initialPlayback: PlaybackState;
  initialQueue: QueueItemDTO[];
}) {
  const [playback, setPlayback] = useState<PlaybackState>(initialPlayback);
  const [queue, setQueue] = useState<QueueItemDTO[]>(initialQueue);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>({ kind: "connecting" });

  // Track the last (trackUri,isPlaying) pair we asked our local Spotify to play
  // so we don't keep re-issuing the same play command on every state tick.
  const lastAppliedRef = useRef<{ trackUri: string | null; isPlaying: boolean }>({
    trackUri: null,
    isPlaying: false,
  });

  // Mirror playback into a ref so callbacks (track-end, drift-correct) can
  // read the LATEST value without having to redeclare themselves every render.
  // Without this, the track-end callback would close over a stale trackUri
  // and either no-op or fire the wrong advance.
  const playbackRef = useRef(playback);
  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  // Fires when this user's Spotify SDK naturally finishes a track.
  // Only the host should drive the room forward — listeners just observe.
  // We pass expectedTrackUri so the server can ignore stale advances that
  // raced with a manual skip.
  const handleTrackEnded = useCallback(
    (endedTrackUri: string) => {
      if (!isHost) return;
      const currentUri = playbackRef.current.trackUri;
      if (currentUri !== endedTrackUri) {
        // We've already moved on (e.g. host clicked Skip during the end-of-
        // track transient). Don't double-advance.
        console.info(
          `[room-player] track-ended for ${endedTrackUri}, but current is ${currentUri} — ignoring`,
        );
        return;
      }
      console.info("[room-player] auto-advancing queue on track end:", endedTrackUri);
      getSocket().emit("playback:next", { roomId, expectedTrackUri: endedTrackUri });
    },
    [isHost, roomId],
  );

  const {
    status: playerStatus,
    deviceId,
    error: playerError,
    getCurrentState,
  } = useSpotifyPlayer(true, { onTrackEnded: handleTrackEnded });

  // -------------------------------------------------------------------------
  // Socket lifecycle
  // -------------------------------------------------------------------------
  useEffect(() => {
    const sock = getSocket();
    let joinTimer: number | null = null;
    let acked = false;

    type JoinAck =
      | { ok: true; state: RoomStateDTO }
      | { ok: false; error: string };

    const onJoin = () => {
      console.info("[room-player] socket connected, sending room:join", { roomId });
      setSocketStatus({ kind: "connecting" });
      sock.emit("room:join", { roomId }, (result: JoinAck | RoomStateDTO) => {
        acked = true;
        if (joinTimer) window.clearTimeout(joinTimer);
        console.info("[room-player] room:join ack", result);

        // Back-compat: tolerate the older shape where ack was just RoomStateDTO.
        const parsed: JoinAck =
          result && typeof result === "object" && "ok" in result
            ? (result as JoinAck)
            : { ok: true, state: result as RoomStateDTO };

        if (!parsed.ok) {
          setSocketStatus({ kind: "error", message: parsed.error });
          return;
        }
        const state = parsed.state;
        if (state.playback) setPlayback(state.playback);
        if (state.queue) setQueue(state.queue);
        setSocketStatus({ kind: "joined" });
      });
      // Cold-start ceiling. Railway + Neon free-tier can take 10–15s to wake
      // from idle, so the timeout must absorb that without giving up too soon.
      joinTimer = window.setTimeout(() => {
        if (!acked) {
          console.warn("[room-player] room:join timed out after 20s");
          setSocketStatus({
            kind: "error",
            message:
              "The room server didn't respond. It may be waking up — try reloading in a few seconds.",
          });
        }
      }, 20000);
    };

    const onConnectError = (err: Error) => {
      console.warn("[room-player] socket connect_error", err);
      setSocketStatus({
        kind: "error",
        message: err.message || "Couldn't reach the room server.",
      });
    };

    const onDisconnect = (reason: string) => {
      console.warn("[room-player] socket disconnected", reason);
      // Don't flip back to "connecting" — socket.io auto-reconnects and onJoin
      // will fire again on reconnect.
    };

    if (sock.connected) onJoin();
    else sock.on("connect", onJoin);
    sock.on("connect_error", onConnectError);
    sock.on("disconnect", onDisconnect);

    const onState = (s: PlaybackState) => setPlayback(s);
    const onQueue = ({ items }: { items: QueueItemDTO[] }) => setQueue(items);
    const onTick = ({ positionMs, serverTime }: { positionMs: number; serverTime: number }) => {
      setPlayback((cur) => ({
        ...cur,
        positionMs,
        lastSyncAt: serverTime,
      }));
    };

    sock.on("playback:state", onState);
    sock.on("queue:update", onQueue);
    sock.on("playback:tick", onTick);

    return () => {
      if (joinTimer) window.clearTimeout(joinTimer);
      sock.off("connect", onJoin);
      sock.off("connect_error", onConnectError);
      sock.off("disconnect", onDisconnect);
      sock.off("playback:state", onState);
      sock.off("queue:update", onQueue);
      sock.off("playback:tick", onTick);
      sock.emit("room:leave", { roomId });
    };
  }, [roomId]);

  // -------------------------------------------------------------------------
  // Mirror canonical playback into this tab's Spotify Web Playback SDK
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!deviceId || playerStatus !== "ready") return;
    if (!playback.trackUri) return;

    const trackChanged = playback.trackUri !== lastAppliedRef.current.trackUri;
    const playStateChanged = playback.isPlaying !== lastAppliedRef.current.isPlaying;

    if (trackChanged || (playback.isPlaying && playStateChanged)) {
      // New track OR transitioning to playing — start playback from the
      // currently projected server position.
      const target = computeTargetPosition(playback);
      void playTrackOnDevice(deviceId, playback.trackUri, target);
      lastAppliedRef.current = {
        trackUri: playback.trackUri,
        isPlaying: true,
      };
    } else if (!playback.isPlaying && playStateChanged) {
      void pausePlayback(deviceId);
      lastAppliedRef.current = {
        trackUri: playback.trackUri,
        isPlaying: false,
      };
    }
  }, [deviceId, playerStatus, playback]);

  // -------------------------------------------------------------------------
  // Periodic drift correction.
  // -------------------------------------------------------------------------
  // Compares the SDK's local position against the server-projected position
  // every few seconds. If we've drifted by more than 1.5s (buffering hiccup,
  // tab throttle on background tab, slow network jitter), seek to catch up.
  // Without this, listeners on flaky networks slowly fall further out of
  // sync with the host as the song plays.
  useEffect(() => {
    if (
      !deviceId ||
      playerStatus !== "ready" ||
      !playback.isPlaying ||
      !playback.trackUri
    ) {
      return;
    }
    const interval = window.setInterval(async () => {
      try {
        const state = await getCurrentState();
        if (!state || state.paused) return;
        const cur = playbackRef.current;
        if (!cur.isPlaying || !cur.trackUri) return;
        // Only correct drift on the same track — during a transition the
        // SDK will briefly report the old track's position.
        const sdkUri = state.track_window?.current_track?.uri;
        if (sdkUri && sdkUri !== cur.trackUri) return;
        const target = computeTargetPosition(cur);
        const drift = Math.abs(state.position - target);
        if (drift > 1500) {
          console.info(
            `[room-player] drift=${Math.round(drift)}ms — seeking to ${target}ms`,
          );
          void seekPlayback(deviceId, target);
        }
      } catch (e) {
        console.warn("[room-player] drift check failed:", e);
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [deviceId, playerStatus, playback.isPlaying, playback.trackUri, getCurrentState]);

  // -------------------------------------------------------------------------
  // Host actions — emit socket events; server is authoritative.
  // -------------------------------------------------------------------------
  const currentTrack: QueueItemDTO | null =
    queue.find((q) => q.trackUri === playback.trackUri) ?? null;

  const onAddToQueue = (trackUri: string) => {
    getSocket().emit("queue:add", { roomId, trackUri });
  };

  const onPlay = () => {
    if (!playback.trackUri) {
      // Nothing playing yet — start the first queued track.
      const first = queue[0];
      if (!first) return;
      getSocket().emit("playback:play", {
        roomId,
        positionMs: 0,
        trackUri: first.trackUri,
      });
      return;
    }
    const target = computeTargetPosition(playback);
    getSocket().emit("playback:play", {
      roomId,
      positionMs: target,
      trackUri: playback.trackUri,
    });
  };

  const onPause = () => {
    const target = computeTargetPosition(playback);
    getSocket().emit("playback:pause", { roomId, positionMs: target });
  };

  const onSkip = () => {
    getSocket().emit("playback:next", { roomId });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  // Until the first track is queued there's nothing to "now play", so we put
  // the search panel front-and-centre for the host. Once something is queued,
  // Now Playing climbs back to the top and search drops below.
  const hasTrack = !!currentTrack;
  return (
    <div className="space-y-4">
      <SpotifyPlayerBanner status={playerStatus} error={playerError} />
      <LiveSyncBanner status={socketStatus} />

      {isHost && !hasTrack && <SearchPanel onAdd={onAddToQueue} />}

      <NowPlaying
        playback={playback}
        currentTrack={currentTrack}
        isHost={isHost}
        onPlay={onPlay}
        onPause={onPause}
        onSkip={onSkip}
      />

      {isHost && hasTrack && <SearchPanel onAdd={onAddToQueue} />}

      <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-wider text-white/50">
            Up next
          </div>
          <div className="text-[11px] text-white/40">
            {Math.max(0, queue.length - (currentTrack ? 1 : 0))} in queue
          </div>
        </div>
        <QueueList items={queue} currentTrackUri={playback.trackUri} />
      </div>
    </div>
  );
}

/**
 * Status banner #1 — the Spotify Web Playback SDK state in THIS tab.
 * Tells the user whether audio will actually play here.
 */
function SpotifyPlayerBanner({
  status,
  error,
}: {
  status: "idle" | "loading" | "ready" | "no-premium" | "error";
  error: string | null;
}) {
  if (status === "loading" || status === "idle") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/8 px-4 py-3 text-sm text-white/65">
        <Loader2 className="h-4 w-4 animate-spin text-neon-green" />
        <div className="min-w-0">
          <div className="font-medium text-white/80">Starting Spotify player…</div>
          <div className="text-xs text-white/45">
            Loading the Web Playback SDK in this tab.
          </div>
        </div>
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neon-green/30 bg-neon-green/[0.06] px-4 py-3 text-sm">
        <Volume2 className="h-4 w-4 text-neon-green shrink-0" />
        <div>
          <div className="font-medium">Your Spotify is the speaker.</div>
          <div className="text-xs text-white/55">
            Audio plays in this tab. Don&apos;t close it.
          </div>
        </div>
      </div>
    );
  }
  if (status === "no-premium") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
        <div>
          <div className="font-medium">Spotify Premium required for playback.</div>
          <div className="text-xs text-white/55">
            You can still see what&apos;s playing and follow the room — but audio needs Premium.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-400/30 bg-rose-400/[0.06] px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">Couldn&apos;t start the Spotify player.</div>
        <div className="text-xs text-white/55 break-words">
          {error ?? "Unknown error"}
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Status banner #2 — the realtime room socket. Separate from the SDK so a
 * stuck socket doesn't masquerade as a stuck Spotify player (or vice versa).
 */
function LiveSyncBanner({ status }: { status: SocketStatus }) {
  if (status.kind === "joined") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-2 text-xs text-white/60">
        <CheckCircle2 className="h-3.5 w-3.5 text-neon-green" />
        <Wifi className="h-3.5 w-3.5 text-white/45" />
        <span>Live sync connected.</span>
      </div>
    );
  }
  if (status.kind === "connecting") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.025] border border-white/8 px-4 py-2 text-xs text-white/60">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
        <span>Joining the live room…</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2 text-xs text-amber-200/90">
      <WifiOff className="h-3.5 w-3.5 text-amber-300" />
      <span className="flex-1">{status.message}</span>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] hover:bg-amber-300/20 transition-colors"
      >
        Reload
      </button>
    </div>
  );
}
