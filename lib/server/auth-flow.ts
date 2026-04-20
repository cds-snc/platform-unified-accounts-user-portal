"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";

import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { loginWithOIDCAndSession } from "@lib/oidc";
import { loadSessionsWithCookies } from "@lib/server/session";
import { getServiceUrlFromHeaders } from "@lib/service-url";
export interface AuthFlowParams {
  sessionId: string;
  requestId: string;
  organization?: string;
}

/**
 * Server Action to complete authentication flow
 * Complete OIDC authentication flow with session
 * This is the shared logic for flow completion
 * Returns either an error or a redirect URL for client-side navigation
 */
export async function completeAuthFlow(
  command: AuthFlowParams
): Promise<{ error: string } | { redirect: string }> {
  const { sessionId, requestId } = command;

  logMessage.info(
    `Completing ${requestId.startsWith("oidc_") ? "OIDC" : "unknown"} auth flow for requestId: ${requestId}`
  );

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { sessions, sessionCookies } = await loadSessionsWithCookies({
    serviceUrl,
    cleanup: true,
  });

  if (requestId.startsWith("oidc_")) {
    // Complete OIDC flow
    const result = await loginWithOIDCAndSession({
      serviceUrl,
      authRequest: requestId.replace("oidc_", ""),
      sessionId,
      sessions,
      sessionCookies,
    });

    // Safety net - ensure we always return a valid object
    if (
      !result ||
      typeof result !== "object" ||
      (!("redirect" in result) && !("error" in result))
    ) {
      logMessage.warn(
        `OIDC auth flow returned unexpected result structure for requestId: ${requestId}`
      );
      return { error: "Authentication completed but navigation failed" };
    }

    return result;
  }

  logMessage.warn("Auth flow received invalid requestId format");
  return { error: "Invalid request ID format" };
}
