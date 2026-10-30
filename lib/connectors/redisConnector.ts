import Redis from "ioredis";

import { logMessage } from "@lib/logger";
let redisConnection: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

const createRedisInstance = async (): Promise<Redis> => {
  if (!process.env.CACHE_URL) throw new Error("No Redis URL is configured");
  return new Redis(process.env.CACHE_URL);
};

export const getRedisInstance = async (): Promise<Redis> => {
  if (redisConnection) return redisConnection;

  if (!connectionPromise) {
    connectionPromise = createRedisInstance()
      .then((redis) => {
        redisConnection = redis;
        return redis;
      })
      .catch((err) => {
        connectionPromise = null; // Reset on failure
        throw err;
      });
  }
  return connectionPromise;
};

// If there is a Redis URL configured instantiate the connection
if (process.env.CACHE_URL) {
  getRedisInstance().catch((err) => {
    logMessage.error("Failed to initialize Redis connection", err);
  });
}
