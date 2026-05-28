// Real-time socket client. Showcase pages use mock data, but this module is
// the production wiring for live rooms — import it from a real room component
// once auth + Spotify SDK are connected.

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// Maintain a rolling estimate of server clock offset so all clients agree
// on "now". Updated by periodic clock:ping round-trips.
let clockOffsetMs = 0;

export function getSocket(token?: string): Socket {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
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

  // Start the clock-sync loop. We send the client clock, receive the server's,
  // and average several samples to converge on an offset.
  let samples: number[] = [];
  const sync = () => {
    if (!socket?.connected) return;
    const clientSentAt = Date.now();
    socket
      .timeout(2000)
      .emit("clock:ping", { clientSentAt }, (err: Error | null, resp?: { serverTime: number; clientSentAt: number }) => {
        if (err || !resp) return;
        const rtt = Date.now() - resp.clientSentAt;
        // Estimate: serverTime corresponds to roughly (clientSent + rtt/2)
        const offset = resp.serverTime - (resp.clientSentAt + rtt / 2);
        samples.push(offset);
        if (samples.length > 8) samples = samples.slice(-8);
        clockOffsetMs = samples.reduce((a, b) => a + b, 0) / samples.length;
      });
  };

  socket.on("connect", () => {
    sync();
  });

  setInterval(sync, 15000);

  return socket;
}

// "Server now" — local time corrected by our running offset estimate.
export const serverNow = () => Date.now() + clockOffsetMs;

// Compute the position a track should be at, given an authoritative state.
export function computeTargetPosition(
  positionMs: number,
  lastSyncAt: number,
  isPlaying: boolean
): number {
  if (!isPlaying) return positionMs;
  return positionMs + Math.max(0, serverNow() - lastSyncAt);
}
