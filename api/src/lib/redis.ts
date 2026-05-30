import Redis from "ioredis";
import { env } from "./env.js";

// Two clients: pub + sub for the Socket.IO Redis adapter.
//
// IMPORTANT: lazyConnect must be false (the default). The Socket.IO Redis
// adapter calls `subscribe()` on the sub client during `io.adapter()` setup;
// if the connection is still lazy it silently never subscribes and emits to
// rooms get dropped — which manifests on the client as "the room server
// didn't respond" because the join broadcast never reaches the joiner.
export const redisPub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const redisSub = redisPub.duplicate();

redisPub.on("error", (e) => console.error("[redis pub] error:", e.message));
redisSub.on("error", (e) => console.error("[redis sub] error:", e.message));
redisPub.on("connect", () => console.log("[redis pub] connected"));
redisSub.on("connect", () => console.log("[redis sub] connected"));

// General-purpose client (for room state caching, presence, etc.).
export const redis = redisPub;
