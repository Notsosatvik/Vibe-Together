import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      avatarUrl: true,
      avatarColor: true,
      bio: true,
      spotifyId: true,
      spotifyProduct: true,
      createdAt: true,
    },
  });
  res.json({ user });
});

usersRouter.get("/:handle", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { handle: req.params.handle },
    select: {
      id: true,
      name: true,
      handle: true,
      avatarUrl: true,
      avatarColor: true,
      bio: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});
