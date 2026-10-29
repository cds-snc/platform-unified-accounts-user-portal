import { logMessage } from "@lib/logger";

import { getRedisInstance } from "../connectors/redisConnector";

import initialFlags from "./default_flag_settings.json";

const checkAll = async () => {
  const redis = await getRedisInstance();
  const keys = await redis.smembers("flags");
  return checkMulti(keys);
};

const checkMulti = async (keys: string[]) => {
  const redis = await getRedisInstance();
  if (keys.length === 0) return {};

  const values = await redis.mget(keys.map((key) => `flag:${key}`));

  const mapped = keys.reduce((acc, key, index) => {
    acc.set(key, values[index] === "1");
    return acc;
  }, new Map());

  return Object.fromEntries(mapped);
};

const removeFlag = async (key: string) => {
  const redis = await getRedisInstance();
  const result = await redis.multi().srem("flags", key).del(`flag:${key}`).exec();
  if (!result || result.some((r) => r instanceof Error)) {
    throw new Error(`Failed to remove flag: ${key}`);
  }
};

const createFlag = async (key: string, value: boolean) => {
  const redis = await getRedisInstance();
  const result = await redis
    .multi()
    .sadd("flags", key)
    .set(`flag:${key}`, value ? "1" : "0")
    .exec();

  if (!result || result.some((r) => r instanceof Error)) {
    throw new Error(`Failed to create flag: ${key}`);
  }
};

export const initiateFlags = async () => {
  logMessage.info("Running flag initialization");

  // Guard: skip if Redis not configured
  if (!process.env.CACHE_URL) {
    logMessage.info("Redis not configured, skipping flag initialization");
    return;
  }

  if (process.env.APP_ENV === "test") {
    logMessage.info("Application is in TEST mode, skipping flag initialization");
    return;
  }

  try {
    let currentFlags = await checkAll();
    const defaultFlags: { [key: string]: boolean } = initialFlags;

    logMessage.info("Checking for deprecated flags");

    const removeFlags = [];
    for (const key in currentFlags) {
      if (typeof defaultFlags[key] === "undefined") {
        removeFlags.push(
          (() => {
            logMessage.info(`Removing flag: ${key} from flag registry`);
            return removeFlag(key);
          })()
        );
      }
    }
    await Promise.all(removeFlags).catch((e) => {
      logMessage.error("Could not remove some deprecated flags", e);
    });

    currentFlags = await checkAll();

    logMessage.info("Checking for new flags");

    const addFlags = [];
    for (const key in initialFlags) {
      if (typeof currentFlags[key] === "undefined" || currentFlags[key] === null) {
        addFlags.push(
          (async () => {
            logMessage.info(`Creating flag: ${key} with value ${defaultFlags[key]}`);
            return createFlag(key, defaultFlags[key]);
          })()
        );
      }
    }
    await Promise.all(addFlags).catch((e) => {
      logMessage.error("Could not add new flags", e);
    });
  } catch (err) {
    logMessage.error("Failed to initiate Flags", err);
  }
};
