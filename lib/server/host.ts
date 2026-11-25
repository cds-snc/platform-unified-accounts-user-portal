/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";

import { logMessage } from "@lib/logger";

type HeaderReader = {
  get: (name: string) => string | null;
};

export function normalizeHost(rawHost: string): string {
  return (
    rawHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/:\d+$/, "") || ""
  );
}

function getAppHosts(): string[] {
  return (process.env.APP_HOSTS ?? "").split(",").map(normalizeHost).filter(Boolean);
}

function parseHostHeader(value: string | null): string | undefined {
  const candidate = value?.split(",")[0]?.trim();

  if (!candidate) {
    return undefined;
  }

  try {
    return new URL(`http://${candidate}`).host;
  } catch {
    return undefined;
  }
}

export function getOriginalHostFromHeaders(_headers: HeaderReader): string {
  const host =
    parseHostHeader(_headers.get("x-forwarded-host")) ??
    parseHostHeader(_headers.get("x-original-host")) ??
    parseHostHeader(_headers.get("host"));

  if (!host) {
    logMessage.warn(`No host found in headers: ${host}`);
    throw new Error("No host found in headers");
  }

  if (!getAppHosts().includes(normalizeHost(host))) {
    throw new Error(`Untrusted host header: ${host}`);
  }

  return host;
}
/**
 * Gets the original host that the user sees in their browser URL.
 * When using rewrites this function prioritizes forwarded headers that preserve the original host.
 *
 * ⚠️ SERVER-SIDE ONLY: This function can only be used in:
 * - Server Actions (functions with "use server")
 * - Server Components (React components that run on the server)
 * - Route Handlers (API routes)
 * - Middleware
 *
 * @returns The host string (e.g., "zitadel.com")
 * @throws Error if no host is found
 */
export async function getOriginalHost(): Promise<string> {
  const _headers = await headers();

  return getOriginalHostFromHeaders(_headers);
}
