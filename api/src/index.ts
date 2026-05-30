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

// CORS — allow the configured WEB_ORIGIN, any *.vercel.app preview of this
// project, and localhost for dev. We must echo back the *specific* origin
// (not "*") because credentials are involved.
const allowOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // same-origin / curl / server-side
  if (origin === env.WEB_ORIGIN) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  // Any Vercel deployment under the user's account, e.g.
  //   https://vibe-together.vercel.app
  //   https://vibe-together-git-main-nososatvik-s-projects.vercel.app
  //   https://vibe-together-1susc8y4m-nososatvik-s-projects.vercel.app
  if (/^https:\/\/vibe-together(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => {
      if (allowOrigin(origin)) return cb(null, true);
      console.warn("[cors] rejected origin:", origin);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
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

// Build marker — bumped whenever we want to confirm a specific deploy
// reached production. Visible via /health.
const BUILD_MARKER = "player-v2";

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    ts: Date.now(),
    build: BUILD_MARKER,
    routes: ["/spotify/token", "/spotify/search", "/auth/spotify/callback"],
  })
);

app.use("/auth", authRouter);
app.use("/spotify", spotifyRouter);
// Also expose the spotify routes under /auth/spotify/* — the SPOTIFY_REDIRECT_URI
// configured in the Spotify Dashboard is /auth/spotify/callback, so the callback
// must be reachable there too.
app.use("/auth/spotify", spotifyRouter);
app.use("/rooms", roomsRouter);
app.use("/users", usersRouter);

console.log(
  `[boot] mounted routers — build=${BUILD_MARKER} — /auth, /spotify, /auth/spotify, /rooms, /users`
);

app.use(errorHandler);

// Socket.IO — handles all real-time room sync, chat, reactions, presence.
initSocketServer(server);

server.listen(env.API_PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`✨ VibeTogether API listening on :${env.API_PORT}`);
});
