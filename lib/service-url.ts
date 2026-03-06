/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { NextRequest } from "next/server";

import { getOriginalHostFromHeaders } from "./server/host";
/**
 * Extracts the service url and region from the headers
 * @param headers
 * @returns the service url and region from the headers
 * @throws if the service url could not be determined
 *
 */
export function getServiceUrlFromHeaders(headers: ReadonlyHeaders): {
  serviceUrl: string;
} {
  if (process.env.ZITADEL_API_URL) {
    return { serviceUrl: process.env.ZITADEL_API_URL };
  }

  const host = getOriginalHostFromHeaders(headers);

  return { serviceUrl: host.includes("localhost") ? `http://${host}` : `https://${host}` };
}

export function constructUrl(request: NextRequest, path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const host = getOriginalHostFromHeaders(request.headers);
  const origin = host.includes("localhost") ? `http://${host}` : `https://${host}`;

  return new URL(`${basePath}${path}`, origin);
}
