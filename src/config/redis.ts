import Redis from "ioredis";
import { env } from "./env";

let redis: Redis | null = null;

export const getRedis = (): Redis | null => {
  if (!env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redis.on("error", (err) => {
      console.warn("Redis error:", err.message);
    });
  }
  return redis;
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const client = getRedis();
  if (!client) return null;
  try {
    if (client.status !== "ready") await client.connect().catch(() => undefined);
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 60): Promise<void> => {
  const client = getRedis();
  if (!client) return;
  try {
    if (client.status !== "ready") await client.connect().catch(() => undefined);
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore cache failures
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // ignore
  }
};
