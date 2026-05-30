// Single source of truth for socket event names + payload shapes.
// Both server and client import from here (the web app vendors a copy).

// Standard ack envelope so the client can distinguish "server replied with
// state" from "server replied with a real error" — both are vastly better
// than the third case ("server never replied, client times out").
export type AckResult<T> =
  | { ok: true; state: T }
  | { ok: false; error: string };

export type ClientToServerEvents = {
  "room:join": (
    payload: { roomId: string },
    ack: (result: AckResult<RoomState>) => void,
  ) => void;
  "room:leave": (payload: { roomId: string }) => void;

  // Host-only playback control. Server authoritatively re-broadcasts.
  "playback:play": (payload: { roomId: string; positionMs: number; trackUri: string }) => void;
  "playback:pause": (payload: { roomId: string; positionMs: number }) => void;
  "playback:seek": (payload: { roomId: string; positionMs: number }) => void;
  "playback:next": (payload: { roomId: string }) => void;

  // Anyone in the room
  "chat:send": (payload: { roomId: string; text: string }) => void;
  "chat:typing": (payload: { roomId: string; isTyping: boolean }) => void;
  "reaction:fire": (payload: { roomId: string; emoji: string; atMs: number }) => void;
  "queue:add": (payload: { roomId: string; trackUri: string }) => void;

  // Clock sync — client sends client_ts, server replies with both -> client computes RTT/skew.
  "clock:ping": (payload: { clientSentAt: number }, ack: (resp: { serverTime: number; clientSentAt: number }) => void) => void;
};

export type ServerToClientEvents = {
  "room:state": (state: RoomState) => void;
  "room:presence": (payload: { userId: string; status: "joined" | "left" }) => void;

  "playback:state": (payload: PlaybackState) => void;
  "playback:tick": (payload: { positionMs: number; serverTime: number }) => void;

  "chat:message": (payload: ChatMessage) => void;
  "chat:typing": (payload: { userId: string; isTyping: boolean }) => void;
  "reaction:fire": (payload: { userId: string; emoji: string; atMs: number }) => void;
  "queue:update": (payload: { items: QueueItem[] }) => void;
};

// =========================================
// Payload types
// =========================================
export type RoomState = {
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
  queue: QueueItem[];
};

export type PlaybackState = {
  trackUri: string | null;
  isPlaying: boolean;
  positionMs: number;
  // Server time (ms since epoch) when positionMs was authoritative.
  // Clients interpolate: effectivePosition = positionMs + (now - lastSyncAt) when playing.
  lastSyncAt: number;
};

export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
};

export type QueueItem = {
  id: string;
  trackUri: string;
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  durationMs: number;
  addedById: string;
  position: number;
};

export type SocketData = {
  userId: string;
};
