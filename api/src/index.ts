console.log("[boot] index.ts starting…");
process.on("uncaughtException", (e) => {
  console.error("[boot] uncaughtException:", e);
});
process.on("unhandledRejection", (e) => {
  console.error("[boot] unhandledRejection:", e);
});

import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

console.log("[boot] loading env…");
import { env } from "./lib/env.js";
console.log("[boot] env loaded. NODE_ENV=", env.NODE_ENV, "API_PORT=", env.API_PORT);
import { authRouter } from "./auth/routes.js";
import { roomsRouter } from "./rooms/routes.js";
import { spotifyRouter } from "./spotify/routes.js";
import { usersRouter } from "./users/routes.js";
import { initSocketServer } from "./sockets/server.js";
import { errorHandler } from "./middleware/error.js";
console.log("[boot] all imports loaded");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/auth", authRouter);
app.use("/spotify", spotifyRouter);
app.use("/rooms", roomsRouter);
app.use("/users", usersRouter);

app.use(errorHandler);

// Socket.IO — handles all real-time room sync, chat, reactions, presence.
initSocketServer(server);

server.listen(env.API_PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`✨ VibeTogether API listening on :${env.API_PORT}`);
});
