"use client";

import { useEffect, useState } from "react";
import { Play, Pause, SkipForward, Music } from "lucide-react";
import type { PlaybackState, QueueItemDTO } from "@/lib/socket";
import { computeTargetPosition } from "@/lib/socket";

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NowPlaying({
  playback,
  currentTrack,
  isHost,
  onPlay,
  onPause,
  onSkip,
}: {
  playback: PlaybackState;
  currentTrack: QueueItemDTO | null;
  isHost: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
}) {
  const [position, setPosition] = useState(0);

  // Smoothly animate the playhead based on the canonical playback state.
  useEffect(() => {
    const update = () => setPosition(computeTargetPosition(playback));
    update();
    if (!playback.isPlaying) return;
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [playback]);

  const duration = currentTrack?.durationMs ?? 0;
  const progress = duration ? Math.min(100, (position / duration) * 100) : 0;

  if (!currentTrack) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient">
            <Music className="h-5 w-5 text-ink-950" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Queue is empty</div>
            <div className="text-xs text-white/55 mt-0.5">
              {isHost
                ? "Search for a track above to start playing."
                : "Waiting for the host to add a track."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
      <div className="flex items-start gap-4">
        {currentTrack.albumArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentTrack.albumArtUrl}
            alt=""
            className="h-20 w-20 rounded-xl object-cover shadow-lg"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-xl bg-brand-gradient">
            <Music className="h-7 w-7 text-ink-950" />
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[10px] uppercase tracking-wider text-neon-green">
            Now playing
          </div>
          <div className="font-display text-lg font-semibold truncate mt-0.5">
            {currentTrack.trackName}
          </div>
          <div className="text-sm text-white/55 truncate">
            {currentTrack.artistName}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full bg-brand-gradient transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/45 tabular-nums">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls — host only */}
      {isHost && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={playback.isPlaying ? onPause : onPlay}
            className="grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-ink-950 hover:brightness-110 transition-all shadow-glow"
            title={playback.isPlaying ? "Pause" : "Play"}
          >
            {playback.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>
          <button
            onClick={onSkip}
            className="grid h-10 w-10 place-items-center rounded-full glass hover:bg-white/10 transition-all"
            title="Skip"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function QueueList({
  items,
  currentTrackUri,
}: {
  items: QueueItemDTO[];
  currentTrackUri: string | null;
}) {
  const upcoming = items.filter((q) => q.trackUri !== currentTrackUri);
  if (upcoming.length === 0) {
    return (
      <div className="text-xs text-white/40 px-2 py-3">
        No tracks queued.
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {upcoming.map((q) => (
        <li
          key={q.id}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5"
        >
          {q.albumArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.albumArtUrl}
              alt=""
              className="h-9 w-9 rounded object-cover"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded bg-white/5">
              <Music className="h-3.5 w-3.5 text-white/40" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{q.trackName}</div>
            <div className="text-xs text-white/45 truncate">{q.artistName}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
