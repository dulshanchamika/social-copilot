import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not set. BullMQ will not function correctly.");
}

const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis || new Redis(redisUrl || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
