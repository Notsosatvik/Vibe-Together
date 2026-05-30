import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type http from "node:http";
import { redisPub, redisSub } from "../lib/redis.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { loadPlayback, projectedPosition, savePlayback } from "./sync.js";
import { refreshSpotifyTokenForUser } from "../spotify/routes.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  RoomState,
} from "./events.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function initSocketServer(httpServer: http.Server): IO {
  const allowedOrigins = (origin: string | undefined): boolean => {
    if (!origin) return true;
    if (origin === env.WEB_ORIGIN) return true;
    if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
    if (/^https:\/\/vibe-together(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true;
    return false;
  };
  const io: IO = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (allowedOrigins(origin)) return cb(null, true);
        cb(new Error(`CORS: socket origin ${origin} not allowed`), false);
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Multi-instance pub/sub via Redis — required for horizontal scaling.
  io.adapter(createAdapter(redisPub, redisSub));

  // Auth: clients pass the JWT access token as a handshake auth field.
  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        parseTokenFromCookie(socket.handshake.headers.cookie);
      if (!token) return next(new Error("Unauthorized"));
      const claims = verifyAccessToken(token);
      socket.data.userId = claims.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => bindRoom(io, socket));

  // Periodic playback tick — every 5s, broadcast positions for all live rooms.
  // Clients use this to detect drift and self-correct.
  setInterval(() => tick(io), 5000);

  return io;
}

function bindRoom(io: IO, socket: S) {
  socket.on("room:join", async ({ roomId }, ack) => {
    const userId = socket.data.userId;
    if (!userId) return;

    // Authorize: must be allowed to join (privacy check done elsewhere).
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, name: true, handle: true, avatarUrl: true, avatarColor: true } },
          },
        },
        queueItems: { where: { playedAt: null }, orderBy: { position: "asc" } },
      },
    });
    if (!room) return;

    socket.join(roomId);

    await prisma.roomParticipant.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { leftAt: null },
      create: { roomId, userId, role: "LISTENER" },
    });

    const playback = await loadPlayback(roomId);
    const state: RoomState = {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      participants: room.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        handle: p.user.handle,
        avatarUrl: p.user.avatarUrl,
        avatarColor: p.user.avatarColor,
        role: p.role,
      })),
      playback: {
        ...playback,
        // Project current position so joiner is already in sync.
        positionMs: projectedPosition(playback),
        lastSyncAt: Date.now(),
      },
      queue: room.queueItems.map((q) => ({
        id: q.id,
        trackUri: q.trackUri,
        trackName: q.trackName,
        artistName: q.artistName,
        albumArtUrl: q.albumArtUrl,
        durationMs: q.durationMs,
        addedById: q.addedById,
        position: q.position,
      })),
    };

    ack(state);
    io.to(roomId).emit("room:presence", { userId, status: "joined" });
  });

  socket.on("room:leave", async ({ roomId }) => {
    const userId = socket.data.userId;
    if (!userId) return;
    socket.leave(roomId);
    await prisma.roomParticipant.updateMany({
      where: { roomId, userId },
      data: { leftAt: new Date() },
    });
    io.to(roomId).emit("room:presence", { userId, status: "left" });
  });

  socket.on("playback:play", async ({ roomId, positionMs, trackUri }) => {
    if (!(await isHostOrCohost(socket.data.userId!, roomId))) return;
    const next = { trackUri, isPlaying: true, positionMs, lastSyncAt: Date.now() };
    await savePlayback(roomId, next);
    io.to(roomId).emit("playback:state", next);
  });

  socket.on("playback:pause", async ({ roomId, positionMs }) => {
    if (!(await isHostOrCohost(socket.data.userId!, roomId))) return;
    const current = await loadPlayback(roomId);
    const next = { ...current, isPlaying: false, positionMs, lastSyncAt: Date.now() };
    await savePlayback(roomId, next);
    io.to(roomId).emit("playback:state", next);
  });

  socket.on("playback:seek", async ({ roomId, positionMs }) => {
    if (!(await isHostOrCohost(socket.data.userId!, roomId))) return;
    const current = await loadPlayback(roomId);
    const next = { ...current, positionMs, lastSyncAt: Date.now() };
    await savePlayback(roomId, next);
    io.to(roomId).emit("playback:state", next);
  });

  socket.on("playback:next", async ({ roomId }) => {
    if (!(await isHostOrCohost(socket.data.userId!, roomId))) return;
    const next = await prisma.queueItem.findFirst({
      where: { roomId, playedAt: null },
      orderBy: { position: "asc" },
    });
    if (!next) return;
    const state = {
      trackUri: next.trackUri,
      isPlaying: true,
      positionMs: 0,
      lastSyncAt: Date.now(),
    };
    await prisma.queueItem.update({ where: { id: next.id }, data: { playedAt: new Date() } });
    await savePlayback(roomId, state);
    io.to(roomId).emit("playback:state", state);
  });

  socket.on("queue:add", async ({ roomId, trackUri }) => {
    const userId = socket.data.userId;
    if (!userId || !trackUri) return;
    try {
      // Resolve track metadata from Spotify using the requester's token.
      const token = await refreshSpotifyTokenForUser(userId);
      const trackId = trackUri.split(":").pop();
      const r = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const t = (await r.json()) as {
        name: string;
        duration_ms: number;
        artists: { name: string }[];
        album: { name: string; images: { url: string }[] };
      };

      // Append to the end of the queue.
      const last = await prisma.queueItem.findFirst({
        where: { roomId, playedAt: null },
        orderBy: { position: "desc" },
      });
      const created = await prisma.queueItem.create({
        data: {
          roomId,
          trackUri,
          trackName: t.name,
          artistName: t.artists.map((a) => a.name).join(", "),
          albumName: t.album.name,
          albumArtUrl: t.album.images[0]?.url ?? null,
          durationMs: t.duration_ms,
          addedById: userId,
          position: (last?.position ?? 0) + 1,
        },
      });

      // Re-broadcast the full live queue so everyone re-renders consistently.
      const items = await prisma.queueItem.findMany({
        where: { roomId, playedAt: null },
        orderBy: { position: "asc" },
      });
      io.to(roomId).emit("queue:update", {
        items: items.map((q) => ({
          id: q.id,
          trackUri: q.trackUri,
          trackName: q.trackName,
          artistName: q.artistName,
          albumArtUrl: q.albumArtUrl,
          durationMs: q.durationMs,
          addedById: q.addedById,
          position: q.position,
        })),
      });

      // If nothing is currently playing, auto-start with this track so the
      // host doesn't have to hit play after adding the first song.
      const playback = await loadPlayback(roomId);
      if (!playback.trackUri && created.position === 1) {
        const state = {
          trackUri,
          isPlaying: true,
          positionMs: 0,
          lastSyncAt: Date.now(),
        };
        await savePlayback(roomId, state);
        io.to(roomId).emit("playback:state", state);
      }
    } catch {
      /* swallow — adding a bad track shouldn't crash the room */
    }
  });

  socket.on("chat:send", async ({ roomId, text }) => {
    const userId = socket.data.userId;
    if (!userId || !text.trim()) return;
    const msg = await prisma.chatMessage.create({
      data: { roomId, userId, text: text.slice(0, 2000) },
    });
    io.to(roomId).emit("chat:message", {
      id: msg.id,
      userId: msg.userId,
      text: msg.text,
      createdAt: msg.createdAt.getTime(),
    });
  });

  socket.on("chat:typing", ({ roomId, isTyping }) => {
    socket.to(roomId).emit("chat:typing", { userId: socket.data.userId!, isTyping });
  });

  socket.on("reaction:fire", ({ roomId, emoji, atMs }) => {
    io.to(roomId).emit("reaction:fire", { userId: socket.data.userId!, emoji, atMs });
    // Persist asynchronously, never block the broadcast.
    prisma.reaction
      .create({ data: { roomId, userId: socket.data.userId!, emoji, atMs } })
      .catch(() => {});
  });

  socket.on("clock:ping", ({ clientSentAt }, ack) => {
    ack({ serverTime: Date.now(), clientSentAt });
  });

  socket.on("disconnect", async () => {
    // Mark all rooms this socket was in as "left" for this user.
    // In practice you'd debounce: a user may reconnect within seconds.
    // For now we just emit presence "left" — the DB cleanup runs on idle timer.
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    for (const roomId of rooms) {
      io.to(roomId).emit("room:presence", {
        userId: socket.data.userId!,
        status: "left",
      });
    }
  });
}

async function isHostOrCohost(userId: string, roomId: string): Promise<boolean> {
  const p = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  return !!p && (p.role === "HOST" || p.role === "COHOST");
}

function parseTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/access_token=([^;]+)/);
  return m?.[1] ?? null;
}

async function tick(io: IO) {
  // Use Socket.IO's rooms map to find active rooms.
  const sockets = await io.fetchSockets();
  const roomIds = new Set<string>();
  for (const s of sockets) {
    for (const r of s.rooms) if (r.startsWith("c")) roomIds.add(r); // cuid rooms start with "c"
  }

  for (const roomId of roomIds) {
    const state = await loadPlayback(roomId);
    if (!state.isPlaying) continue;
    io.to(roomId).emit("playback:tick", {
      positionMs: projectedPosition(state),
      serverTime: Date.now(),
    });
  }
}
