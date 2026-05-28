import Redis from "ioredis";
import { env } from "./env.js";

// Two clients: pub + sub for the Socket.IO Redis adapter.
export const redisPub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const redisSub = redisPub.duplicate();

// General-purpose client (for room state caching, presence, etc.).
export const redis = redisPub;
