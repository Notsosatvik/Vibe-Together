// Real-time socket client for room sync. Single shared instance.
// Reads its access token from localStorage (set during OAuth bootstrap) so
// it can hand-shake even when cross-site cookies are blocked.

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

// Mirror the API's events.ts so the client and server stay in sync. (We can't
// import across packages here without monorepo wiring, so we copy the shape.)
export type PlaybackState = {
  trackUri: string | null;
  isPlaying: boolean;
  positionMs: number;
  lastSyncAt: number;
};

export type QueueItemDTO = {
  id: string;
  trackUri: string;
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  durationMs: number;
  addedById: string;
  position: number;
};

export type RoomStateDTO = {
  id: string;
  name: string;
  hostId: string;
  participants: Array<{
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    role: "HOST" | "COHOST" | "LISTENER";
  }>;
  playback: PlaybackState;
  queue: QueueItemDTO[];
};

let socket: Socket | null = null;
let clockOffsetMs = 0;

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("vt_access");
  } catch {
    return null;
  }
}

export function getSocket(): Socket {
  if (socket) return socket;

  const url =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    API_URL ||
    "http://localhost:4000";
  const token = readAccessToken();

  socket = io(url, {
    autoConnect: true,
    withCredentials: true,
    auth: token ? { token } : undefined,
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    reconnectionAttempts: Infinity,
  });

  let samples: number[] = [];
  const sync = () => {
    if (!socket?.connected) return;
    const clientSentAt = Date.now();
    socket
      .timeout(2000)
      .emit(
        "clock:ping",
        { clientSentAt },
        (err: Error | null, resp?: { serverTime: number; clientSentAt: number }) => {
          if (err || !resp) return;
          const rtt = Date.now() - resp.clientSentAt;
          const offset = resp.serverTime - (resp.clientSentAt + rtt / 2);
          samples.push(offset);
          if (samples.length > 8) samples = samples.slice(-8);
          clockOffsetMs = samples.reduce((a, b) => a + b, 0) / samples.length;
        }
      );
  };

  socket.on("connect", () => sync());
  setInterval(sync, 15000);

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const serverNow = () => Date.now() + clockOffsetMs;

export function computeTargetPosition(state: PlaybackState): number {
  if (!state.isPlaying) return state.positionMs;
  return state.positionMs + Math.max(0, serverNow() - state.lastSyncAt);
}
