import { getRedisInstance } from "@lib/connectors/redisConnector";

import flagInitialSettings from "../flags/default_flag_settings.json";

import { FeatureFlagKeys, FeatureFlags, Flags, PickFlags } from "./types";

const getKeys = async (): Promise<FeatureFlagKeys[]> => {
  const redis = await getRedisInstance();
  const keys = await redis.smembers("flags");
  return keys.filter((key): key is FeatureFlagKeys => key in FeatureFlags);
};

/**
 * Checks a single Application Setting Flag
 * @param key Application setting flag key
 * @returns Boolean value of Flag key
 */
export const checkOne = async (key: FeatureFlagKeys): Promise<boolean> => {
  // If REDIS is not configured return the default values for the flags
  if (!process.env.CACHE_URL) {
    return (flagInitialSettings as Record<string, boolean>)[key];
  }
  const redis = await getRedisInstance();
  const value = await redis.get(`flag:${key}`);
  return value === "1";
};

/**
 * Get a list of all available Application Setting Flags and their values
 * @param ability User's Ability Instance
 * @returns An object of {flag: value ...}
 */
export const checkAll = async (): Promise<Flags> => {
  const keys = await getKeys();
  return checkMulti(keys);
};

const checkMulti = async <T extends FeatureFlagKeys[]>(keys: T): Promise<PickFlags<T>> => {
  const redis = await getRedisInstance();
  if (keys.length === 0) return {} as PickFlags<T>;

  const values = await redis.mget(keys.map((key) => `flag:${key}`));

  const mapped = keys.reduce((acc, key, index) => {
    acc.set(key, values[index] === "1");

    return acc;
  }, new Map<string, boolean>());

  return Object.fromEntries(mapped) as PickFlags<T>;
};

export async function getSomeFlags<T extends FeatureFlagKeys[]>(flags: T): Promise<PickFlags<T>> {
  if (!Array.isArray(flags) || flags.length === 0) return {} as PickFlags<T>;
  return (await checkMulti(flags)) as PickFlags<T>;
}
