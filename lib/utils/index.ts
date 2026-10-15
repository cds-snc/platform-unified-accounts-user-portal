/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export * from "./base64";

// Type for Next.js page search params
export type SearchParams = Record<string | number | symbol, string | undefined>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Recursively filters out non-serializable properties and returns a new, clean object.
 * @param {object} obj - The original object.
 * @returns {object} A new serializable object.
 */
export function getSerializableObject<T>(obj: T): T {
  // Use JSON.stringify with a replacer function to filter properties
  const jsonString = JSON.stringify(obj, (_, value) => {
    // Exclude functions and symbols by returning undefined
    if (typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }

    // Handle Buffer objects serialized by Node.js as { type: "Buffer", data: [...] }
    // to make them accessible as plain arrays
    if (value?.type === "Buffer" && Array.isArray(value.data)) {
      return value.data;
    }

    // For all other serializable values, return them as is
    return value;
  });

  // Parse the resulting JSON string back into a new JavaScript object
  // This new object is guaranteed to be serializable
  return JSON.parse(jsonString);
}

/**
 * Builds a URL with requestId as a query parameter if provided
 * @param {string} path - The base path for the URL
 * @param {string | undefined} requestId - Optional requestId to add as query parameter
 * @returns {string} The path with requestId query parameter if provided
 */
export function buildUrlWithRequestId(path: string, requestId?: string): string {
  if (!requestId) return path;
  const params = new URLSearchParams();
  params.set("requestId", requestId);
  return `${path}?${params.toString()}`;
}
