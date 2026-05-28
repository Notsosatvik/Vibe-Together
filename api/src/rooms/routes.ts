import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const roomsRouter = Router();

const generateCode = () =>
  "VIBE-" +
  Array.from({ length: 6 })
    .map(() => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)])
    .join("");

roomsRouter.get("/", async (_req, res) => {
  const rooms = await prisma.room.findMany({
    where: { closedAt: null, privacy: "PUBLIC" },
    include: {
      host: { select: { id: true, name: true, handle: true, avatarUrl: true, avatarColor: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ rooms });
});

roomsRouter.post(
  "/",
  requireAuth,
  validate(
    z.object({
      name: z.string().min(2).max(60),
      privacy: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).default("PUBLIC"),
      genre: z.string().max(40).optional(),
      vibe: z.string().max(80).optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const room = await prisma.room.create({
        data: {
          name: req.body.name,
          privacy: req.body.privacy,
          genre: req.body.genre,
          vibe: req.body.vibe,
          code: generateCode(),
          hostId: req.user!.sub,
          participants: {
            create: { userId: req.user!.sub, role: "HOST" },
          },
        },
      });
      res.status(201).json({ room });
    } catch (err) {
      next(err);
    }
  }
);

roomsRouter.get("/:id", async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true, handle: true, avatarUrl: true, avatarColor: true } },
        participants: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, name: true, handle: true, avatarUrl: true, avatarColor: true } },
          },
        },
        queueItems: {
          where: { playedAt: null },
          orderBy: { position: "asc" },
          take: 50,
        },
      },
    });
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

roomsRouter.post("/join", requireAuth, validate(z.object({ code: z.string() })), async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({ where: { code: req.body.code.toUpperCase() } });
    if (!room || room.closedAt) return res.status(404).json({ error: "Room not found" });
    await prisma.roomParticipant.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.user!.sub } },
      update: { leftAt: null },
      create: { roomId: room.id, userId: req.user!.sub, role: "LISTENER" },
    });
    res.json({ roomId: room.id });
  } catch (err) {
    next(err);
  }
});

// Minimal zod validation middleware factory.
function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    req.body = parsed.data;
    next();
  };
}
