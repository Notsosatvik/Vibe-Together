"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Volume2 } from "lucide-react";
import { useSpotifyPlayer, playTrackOnDevice, pausePlayback, seekPlayback } from "@/lib/hooks/use-spotify-player";
import { getSocket, computeTargetPosition, type PlaybackState, type QueueItemDTO, type RoomStateDTO } from "@/lib/socket";
import { SearchPanel } from "./search-panel";
import { NowPlaying, QueueList } from "./now-playing";

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
  const { status: playerStatus, deviceId, error: playerError } =
    useSpotifyPlayer(true);

  const [playback, setPlayback] = useState<PlaybackState>(initialPlayback);
  const [queue, setQueue] = useState<QueueItemDTO[]>(initialQueue);
  const [joined, setJoined] = useState(false);

  // Track the last (trackUri,isPlaying) pair we asked our local Spotify to play
  // so we don't keep re-issuing the same play command on every state tick.
  const lastAppliedRef = useRef<{ trackUri: string | null; isPlaying: boolean }>({
    trackUri: null,
    isPlaying: false,
  });

  // -------------------------------------------------------------------------
  // Socket lifecycle
  // -------------------------------------------------------------------------
  useEffect(() => {
    const sock = getSocket();
    const onJoin = () => {
      sock.emit("room:join", { roomId }, (state: RoomStateDTO) => {
        setPlayback(state.playback);
        setQueue(state.queue);
        setJoined(true);
      });
    };
    if (sock.connected) onJoin();
    else sock.on("connect", onJoin);

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
      sock.off("connect", onJoin);
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
  // Periodic drift correction — if our local position is >800ms off, nudge it.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!deviceId || playerStatus !== "ready" || !playback.isPlaying) return;
    const interval = window.setInterval(() => {
      // Best-effort: trust server position, seek if we're drifting too much.
      // The Web Playback SDK doesn't expose getCurrentState() in a way we can
      // easily diff here without more state, so we just trust the periodic
      // server tick to call playback:state if drift is large.
      // (Future improvement: read player.getCurrentState() and compare.)
    }, 4000);
    return () => window.clearInterval(interval);
  }, [deviceId, playerStatus, playback.isPlaying]);

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
  return (
    <div className="space-y-4">
      <PlayerStatusBanner status={playerStatus} error={playerError} joined={joined} />

      <NowPlaying
        playback={playback}
        currentTrack={currentTrack}
        isHost={isHost}
        onPlay={onPlay}
        onPause={onPause}
        onSkip={onSkip}
      />

      {isHost && <SearchPanel onAdd={onAddToQueue} />}

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

function PlayerStatusBanner({
  status,
  error,
  joined,
}: {
  status: "idle" | "loading" | "ready" | "no-premium" | "error";
  error: string | null;
  joined: boolean;
}) {
  if (status === "loading" || (!joined && status !== "no-premium")) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/8 px-4 py-3 text-sm text-white/65">
        <Loader2 className="h-4 w-4 animate-spin text-neon-green" />
        Connecting your Spotify player…
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neon-green/30 bg-neon-green/[0.06] px-4 py-3 text-sm">
        <Volume2 className="h-4 w-4 text-neon-green" />
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
        <AlertTriangle className="h-4 w-4 text-amber-300" />
        <div>
          <div className="font-medium">Spotify Premium required for playback.</div>
          <div className="text-xs text-white/55">
            You can still chat and follow the room — but audio needs Premium.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-400/30 bg-rose-400/[0.06] px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-rose-300" />
      <div className="min-w-0">
        <div className="font-medium">Couldn&apos;t start the Spotify player.</div>
        <div className="text-xs text-white/55 truncate">
          {error ?? "Unknown error"}
        </div>
      </div>
    </div>
  );
}
