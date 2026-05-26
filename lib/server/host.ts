/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";

import { TRUSTED_DOMAINS } from "@root/constants/site-config";
import { logMessage } from "@lib/logger";

type HeaderReader = {
  get: (name: string) => string | null;
};

const TRUSTED_SITE_HOSTS = Object.values(TRUSTED_DOMAINS).map((config) => {
  return normalizeHost(config.baseUrl);
});

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

export const isTrustedSiteHost = (rawHost: string): boolean => {
  const normalizedHost = normalizeHost(rawHost);

  // Check for exact match
  if (TRUSTED_SITE_HOSTS.includes(normalizedHost)) {
    return true;
  }

  // Check if it's a subdomain of a trusted host
  return TRUSTED_SITE_HOSTS.some((trustedHost) => {
    return normalizedHost.endsWith(`.${trustedHost}`);
  });
};

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

function isLocalHost(host: string): boolean {
  const hostname = new URL(`http://${host}`).hostname;

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isLambdaPRReviewHost(host: string): boolean {
  const hostname = new URL(`http://${host}`).hostname;

  return process.env.PR_REVIEW === "true" && hostname.endsWith(".lambda-url.ca-central-1.on.aws");
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

  if (!isLocalHost(host) && !isLambdaPRReviewHost(host) && !isTrustedSiteHost(host)) {
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
