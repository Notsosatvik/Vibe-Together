// Room sync engine. The server is authoritative.
//
// === The model ===
//
// 1. Every room has a PlaybackState in Postgres + a hot copy in Redis.
//    The hot copy lets us serve `room:join` and `playback:tick` without
//    hitting the DB on every tick.
//
// 2. Only the host (or a co-host) emits playback:* commands. The server
//    validates, advances the canonical state, and re-broadcasts to everyone
//    in the socket room.
//
// 3. To keep all clients within ~30ms of each other:
//
//    a) Clients periodically clock-sync via "clock:ping" — they record the
//       round-trip and compute a server offset.
//
//    b) When clients receive playback:state or playback:tick, they compute:
//
//         effectivePosition = positionMs + max(0, (now() - lastSyncAt))
//
//       using their server-offset-adjusted clock. They reconcile their local
//       Spotify Web Playback SDK position to that target. If drift > 250ms,
//       they hard-seek; otherwise they bias playback speed +/- 5% for a few
//       seconds and then return to 1.0x.
//
//    c) Every ~5s the server emits a "playback:tick" so late joiners and
//       drifted clients self-correct.
//
// 4. Late joiners receive the full RoomState on join — so they sync to the
//    exact track + position the room is currently at.

import type { PlaybackState } from "./events.js";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";

const HOT_KEY = (roomId: string) => `room:${roomId}:playback`;
const TTL_SECONDS = 60 * 60 * 6; // 6h — refresh on every write

// Redis is a CACHE only — if it's unreachable we must still be able to load
// + save playback state from Postgres. Without these guards, a flaky Upstash
// connection takes down every room:join with an uninformative server error.
async function safeRedisGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (e) {
    console.warn("[sync] redis.get failed, falling back to DB:", (e as Error).message);
    return null;
  }
}

async function safeRedisSet(key: string, value: string): Promise<void> {
  try {
    await redis.set(key, value, "EX", TTL_SECONDS);
  } catch (e) {
    console.warn("[sync] redis.set failed (cache miss only):", (e as Error).message);
  }
}

export async function loadPlayback(roomId: string): Promise<PlaybackState> {
  const cached = await safeRedisGet(HOT_KEY(roomId));
  if (cached) {
    try {
      return JSON.parse(cached) as PlaybackState;
    } catch {
      /* fall through to DB */
    }
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      currentTrackUri: true,
      isPlaying: true,
      currentPositionMs: true,
      lastSyncAt: true,
    },
  });
  if (!room) {
    return { trackUri: null, isPlaying: false, positionMs: 0, lastSyncAt: Date.now() };
  }

  const state: PlaybackState = {
    trackUri: room.currentTrackUri,
    isPlaying: room.isPlaying,
    positionMs: room.currentPositionMs,
    lastSyncAt: room.lastSyncAt.getTime(),
  };
  await safeRedisSet(HOT_KEY(roomId), JSON.stringify(state));
  return state;
}

export async function savePlayback(roomId: string, state: PlaybackState): Promise<void> {
  await safeRedisSet(HOT_KEY(roomId), JSON.stringify(state));
  // Persist to Postgres — but throttled. In production wrap with a debounced writer.
  await prisma.room
    .update({
      where: { id: roomId },
      data: {
        currentTrackUri: state.trackUri,
        isPlaying: state.isPlaying,
        currentPositionMs: state.positionMs,
        lastSyncAt: new Date(state.lastSyncAt),
      },
    })
    .catch((e) => console.warn("[sync] room update failed:", (e as Error).message));
}

// Compute the position a fresh joiner should start at, given the current state.
export function projectedPosition(state: PlaybackState, now: number = Date.now()): number {
  if (!state.isPlaying) return state.positionMs;
  return state.positionMs + Math.max(0, now - state.lastSyncAt);
}
