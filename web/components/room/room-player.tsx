"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  useSpotifyPlayer,
  playTrackOnDevice,
  pausePlayback,
  seekPlayback,
} from "@/lib/hooks/use-spotify-player";
import {
  getSocket,
  computeTargetPosition,
  serverNow,
  type PlaybackState,
  type QueueItemDTO,
  type RoomStateDTO,
} from "@/lib/socket";
import { SearchPanel, type OptimisticTrack } from "./search-panel";
import { NowPlaying, QueueList } from "./now-playing";
import { ReactionsOverlay } from "./reactions-overlay";

// The emoji set offered in the room's reaction bar. Keep this short — too many
// choices and the bar wraps awkwardly on mobile. 🔥 and 💣 are the two the
// user explicitly asked for; the rest cover the usual "this slaps / I'm dead /
// pretty / cute" reactions you'd see in a live listening session.
const REACTION_EMOJIS = ["🔥", "💣", "🎉", "❤️", "😂", "👀", "💀", "✨"] as const;

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
  meId,
  initialPlayback,
  initialQueue,
}: {
  roomId: string;
  isHost: boolean;
  // The current viewer's user id. Used to gate per-row queue actions (e.g.
  // listeners can remove tracks THEY added, but not anyone else's). Optional
  // because the room can briefly render before /me has resolved.
  meId?: string | null;
  initialPlayback: PlaybackState;
  initialQueue: QueueItemDTO[];
}) {
  const [playback, setPlayback] = useState<PlaybackState>(initialPlayback);
  const [queue, setQueue] = useState<QueueItemDTO[]>(initialQueue);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>({ kind: "connecting" });
  // Surfaces the LAST error from Spotify's /me/player/* commands (play, pause,
  // seek). Before we added .ok checking inside those helpers the listener
  // would just sit there in silence with no indication why — now they see
  // exactly which Spotify call failed and can hit Retry.
  const [playbackError, setPlaybackError] = useState<string | null>(null);

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
    activate,
  } = useSpotifyPlayer(true, { onTrackEnded: handleTrackEnded });

  // Have we successfully primed the SDK's <audio> element with a user
  // gesture? Browsers (especially mobile Safari) will silently swallow
  // playback otherwise — Spotify accepts our PUT /me/player/play with a
  // 2xx response and the progress bar ticks, but no sound comes out of
  // the tab. We track this so the "Tap to start audio" button can hide
  // itself once the gesture has happened.
  const [audioArmed, setAudioArmed] = useState(false);

  // Most recent emoji to spawn in the floating reactions overlay. Bumped
  // both by local clicks (instant feedback) and by inbound socket events
  // (other users' reactions). Counter id is monotonic so even repeated
  // taps of the same emoji produce a fresh animation.
  const [reactionEvent, setReactionEvent] = useState<{
    id: number;
    emoji: string;
  } | null>(null);

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

    // Server fans out reaction:fire to everyone in the room (including the
    // sender). We bump a monotonic counter and forward it to the overlay —
    // the overlay spawns one floating emoji per event id, so two people
    // tapping 🔥 simultaneously produce two emojis, not one.
    const onReaction = ({ emoji }: { userId: string; emoji: string; atMs: number }) => {
      setReactionEvent((prev) => ({ id: (prev?.id ?? 0) + 1, emoji }));
    };
    sock.on("reaction:fire", onReaction);

    return () => {
      if (joinTimer) window.clearTimeout(joinTimer);
      sock.off("connect", onJoin);
      sock.off("connect_error", onConnectError);
      sock.off("disconnect", onDisconnect);
      sock.off("playback:state", onState);
      sock.off("queue:update", onQueue);
      sock.off("playback:tick", onTick);
      sock.off("reaction:fire", onReaction);
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
      playTrackOnDevice(deviceId, playback.trackUri, target)
        .then(() => setPlaybackError(null))
        .catch((e: Error) => {
          console.warn("[room-player] playTrackOnDevice failed:", e);
          setPlaybackError(
            e.message ??
              "Spotify wouldn't play this track on your device. Try clicking Retry.",
          );
          // Reset lastApplied so the next playback:state tick re-triggers
          // the play call — otherwise we'd never recover from a transient
          // error without a manual page reload.
          lastAppliedRef.current = { trackUri: null, isPlaying: false };
        });
      lastAppliedRef.current = {
        trackUri: playback.trackUri,
        isPlaying: true,
      };
    } else if (!playback.isPlaying && playStateChanged) {
      pausePlayback(deviceId).catch((e) =>
        console.warn("[room-player] pausePlayback failed:", e),
      );
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
  // Host actions — emit socket events AND optimistically update local state.
  // -------------------------------------------------------------------------
  // The room-player used to wait for the server to broadcast playback:state /
  // queue:update back before flipping the button icon or showing the new
  // queued track. On Railway with US-east users that round-trip is 200-700ms
  // — long enough to feel like a stuck button. Now every host action mutates
  // local state synchronously and the server broadcast just reconciles
  // (idempotently — setting isPlaying=true twice is fine).
  const currentTrack: QueueItemDTO | null =
    queue.find((q) => q.trackUri === playback.trackUri) ?? null;

  // Bump a counter to mint stable but unique placeholder IDs for optimistic
  // queue rows. Server's broadcast will replace these with real DB ids.
  const optimisticIdRef = useRef(0);

  const onAddToQueue = (track: OptimisticTrack) => {
    const sock = getSocket();
    sock.emit("queue:add", { roomId, trackUri: track.uri });
    // Optimistically insert the row at the end of the queue. The server's
    // queue:update broadcast will reconcile (the placeholder will be
    // displaced by the canonical QueueItemDTO with a real database id).
    setQueue((prev) => {
      if (prev.some((q) => q.trackUri === track.uri && q.id.startsWith("opt-"))) {
        return prev;
      }
      optimisticIdRef.current += 1;
      const optimistic: QueueItemDTO = {
        id: `opt-${optimisticIdRef.current}`,
        trackUri: track.uri,
        trackName: track.name,
        artistName: track.artistName,
        albumArtUrl: track.albumArtUrl,
        durationMs: track.durationMs,
        addedById: "me",
        position:
          (prev.length > 0 ? Math.max(...prev.map((q) => q.position)) : -1) + 1,
      };
      return [...prev, optimistic];
    });
  };

  const onPlay = () => {
    if (!playback.trackUri) {
      // Nothing playing yet — start the first queued track.
      const first = queue[0];
      if (!first) return;
      // Optimistic: treat the first track as now-playing immediately so the
      // host's tab issues playTrackOnDevice without waiting for the server.
      setPlayback({
        trackUri: first.trackUri,
        isPlaying: true,
        positionMs: 0,
        lastSyncAt: serverNow(),
      });
      getSocket().emit("playback:play", {
        roomId,
        positionMs: 0,
        trackUri: first.trackUri,
      });
      return;
    }
    const target = computeTargetPosition(playback);
    // Optimistic: flip to playing now so the icon updates and the mirror
    // effect re-issues PUT /me/player/play at the projected position.
    setPlayback((cur) => ({
      ...cur,
      isPlaying: true,
      positionMs: target,
      lastSyncAt: serverNow(),
    }));
    getSocket().emit("playback:play", {
      roomId,
      positionMs: target,
      trackUri: playback.trackUri,
    });
  };

  const onPause = () => {
    const target = computeTargetPosition(playback);
    setPlayback((cur) => ({
      ...cur,
      isPlaying: false,
      positionMs: target,
      lastSyncAt: serverNow(),
    }));
    getSocket().emit("playback:pause", { roomId, positionMs: target });
  };

  const onSkip = () => {
    // Optimistic: advance to the next unplayed queue item right now.
    const upcoming = queue.filter(
      (q) => q.trackUri !== playback.trackUri && !q.id.startsWith("opt-"),
    );
    const next = upcoming[0];
    if (next) {
      setPlayback({
        trackUri: next.trackUri,
        isPlaying: true,
        positionMs: 0,
        lastSyncAt: serverNow(),
      });
    } else {
      // No queue left — optimistically pause; server will catch up.
      setPlayback((cur) => ({
        ...cur,
        isPlaying: false,
        lastSyncAt: serverNow(),
      }));
    }
    getSocket().emit("playback:next", {
      roomId,
      expectedTrackUri: playback.trackUri ?? undefined,
    });
  };

  // Remove a single track from the upcoming queue. Server authorizes:
  // only the user who added it OR a host/cohost can remove. We optimistically
  // drop it from local state so the row vanishes immediately — if the server
  // rejects (rare; user would have to race their own permissions), the next
  // queue:update broadcast will put it back.
  const onRemoveFromQueue = (queueItemId: string) => {
    if (queueItemId.startsWith("opt-")) return; // placeholder; server doesn't know it yet
    getSocket().emit("queue:remove", { roomId, queueItemId });
    setQueue((prev) => prev.filter((q) => q.id !== queueItemId));
  };

  // Fire an emoji reaction to the whole room. We update local overlay
  // synchronously so the sender sees their own emoji float up instantly,
  // and ALSO emit reaction:fire to the server. The server then broadcasts
  // to everyone (including us); our socket listener will spawn another
  // emoji from that broadcast. That's fine — two emojis is better feedback
  // than waiting 200ms for the round-trip and showing one.
  const onReact = (emoji: string) => {
    setReactionEvent((prev) => ({ id: (prev?.id ?? 0) + 1, emoji }));
    getSocket().emit("reaction:fire", { roomId, emoji, atMs: Date.now() });
  };

  // Manual retry button for the playback-error banner. Just nudges the
  // mirroring effect — clearing lastApplied makes the next render re-issue
  // the play command using the latest projected server position.
  //
  // Also calls activate() so this click counts as the user gesture that
  // primes the SDK's <audio> element. Doubles up nicely: any time a user
  // hits Retry we both refresh the play command AND unblock browser
  // autoplay restrictions in one step.
  const onRetryPlayback = async () => {
    setPlaybackError(null);
    await activate();
    setAudioArmed(true);
    if (!deviceId || playerStatus !== "ready" || !playback.trackUri) return;
    const target = computeTargetPosition(playback);
    try {
      await playTrackOnDevice(deviceId, playback.trackUri, target);
      lastAppliedRef.current = {
        trackUri: playback.trackUri,
        isPlaying: playback.isPlaying,
      };
    } catch (e) {
      console.warn("[room-player] retry playTrackOnDevice failed:", e);
      setPlaybackError(
        (e as Error).message ?? "Spotify still won't play this track.",
      );
    }
  };

  // Single click that does the "I am ready to hear audio" handshake:
  // activate the SDK's audio element from inside this user gesture, then
  // immediately re-issue the play command at the projected server position
  // so audio starts NOW (not on the next server tick).
  const onArmAudio = async () => {
    await activate();
    setAudioArmed(true);
    if (!deviceId || playerStatus !== "ready" || !playback.trackUri) return;
    const target = computeTargetPosition(playback);
    try {
      await playTrackOnDevice(deviceId, playback.trackUri, target);
      lastAppliedRef.current = {
        trackUri: playback.trackUri,
        isPlaying: playback.isPlaying,
      };
    } catch (e) {
      console.warn("[room-player] arm-audio play failed:", e);
      setPlaybackError(
        (e as Error).message ??
          "Spotify accepted the play command but audio didn't start.",
      );
    }
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
      {playerStatus === "ready" && !audioArmed && (
        <ActivateAudioBanner onArm={onArmAudio} />
      )}
      {playbackError && (
        <PlaybackErrorBanner
          message={playbackError}
          onRetry={onRetryPlayback}
          onDismiss={() => setPlaybackError(null)}
        />
      )}

      {isHost && !hasTrack && <SearchPanel onAdd={onAddToQueue} />}

      {/* `relative` is load-bearing — ReactionsOverlay positions itself
          absolute inset-0 within this container so emojis float up out of
          the now-playing card, not out of the viewport. */}
      <div className="relative">
        <NowPlaying
          playback={playback}
          currentTrack={currentTrack}
          isHost={isHost}
          onPlay={onPlay}
          onPause={onPause}
          onSkip={onSkip}
        />
        <ReactionsOverlay event={reactionEvent} />
      </div>

      <ReactionBar onReact={onReact} />

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
        <QueueList
          items={queue}
          currentTrackUri={playback.trackUri}
          meId={meId}
          isHost={isHost}
          onRemove={onRemoveFromQueue}
        />
      </div>
    </div>
  );
}

/**
 * Horizontal strip of emoji buttons. Everyone in the room (host or listener)
 * can tap any emoji to broadcast a floating reaction to everyone else's
 * screens. Local feedback is instant because room-player triggers the
 * overlay synchronously *before* the server round-trip.
 */
function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
      <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-white/50">
        React
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] hover:bg-white/[0.10] active:bg-white/[0.16] active:scale-95 transition-all text-xl border border-white/8 hover:border-white/20 select-none"
            aria-label={`React with ${emoji}`}
            title={`React with ${emoji}`}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        ))}
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
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">Spotify Premium required for playback.</div>
          <div className="text-xs text-white/65 mt-0.5">
            You can still see what&apos;s playing and follow the room — but audio needs Premium.
          </div>
          <div className="text-[11px] text-white/45 mt-1.5">
            Just upgraded? Click Reload — we cached your old plan from when you
            first connected Spotify.
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors"
        >
          Reload
        </button>
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
 * Banner that prompts the listener to tap once so the browser autoplay
 * policy lets the SDK's audio element actually emit sound.
 *
 * THIS IS LITERALLY THE ONLY WAY to get audio out of the Web Playback
 * SDK on a fresh page load in most modern browsers. Spotify happily PUTs
 * /me/player/play with a 200 OK, the progress bar advances, but no audio
 * comes out of the speakers until player.activateElement() has been
 * called from inside a real user gesture. We tried doing it inside the
 * `ready` listener (which fires as part of an async chain initiated by
 * the SDK, NOT inside a user gesture stack) — Safari rejects.
 *
 * Hidden once the user clicks: subsequent track changes auto-play
 * without further prompts because the AudioContext is already unlocked.
 */
function ActivateAudioBanner({ onArm }: { onArm: () => void }) {
  return (
    <button
      onClick={onArm}
      className="flex w-full items-center gap-3 rounded-xl border border-neon-green/40 bg-neon-green/[0.08] px-4 py-3 text-sm text-left hover:bg-neon-green/[0.12] transition-colors"
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-neon-green text-ink-950 shrink-0">
        <Play className="h-4 w-4 fill-current" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">Tap here to start audio</div>
        <div className="text-xs text-white/65 mt-0.5">
          Your browser needs one tap before it&apos;ll let us play sound in
          this tab.
        </div>
      </div>
    </button>
  );
}

/**
 * Status banner #3 — a Spotify /me/player/* command failed (play, pause, or
 * seek). This is the banner that finally tells the listener "your device
 * couldn't be activated" instead of just sitting silently while the host
 * thinks the song is playing.
 *
 * Most common message we'll see here:
 *   - "Spotify 404: NO_ACTIVE_DEVICE" — even after our one-shot retry, the
 *     device hasn't registered. Usually fixed by the listener clicking
 *     anywhere in the tab (browser autoplay policy) or by hitting Retry.
 *   - "Spotify 403: PREMIUM_REQUIRED" — listener's account isn't Premium
 *     even though /spotify/token claimed it was (e.g. family-plan child).
 *   - "Spotify 403: Restricted device" — region/account restriction.
 */
function PlaybackErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/[0.08] px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">Spotify wouldn&apos;t start playback.</div>
        <div className="text-xs text-white/65 break-words mt-0.5">
          {message}
        </div>
        <div className="text-[11px] text-white/45 mt-1.5">
          Tip: click anywhere on this tab first — some browsers block audio
          until you interact with the page.
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onRetry}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors"
        >
          Retry
        </button>
        <button
          onClick={onDismiss}
          className="text-white/45 hover:text-white/80 text-xs px-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
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
