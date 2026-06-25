/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

import { redirect } from "next/navigation";

import { logMessage } from "@lib/logger";
import { loginWithOIDCAndSession } from "@lib/oidc";

import { buildUrlWithRequestId } from "../utils";

import { loadSessionsWithCookies } from "./session";

type FinishFlowCommand = {
  sessionId: string;
  requestId?: string;
};

/**
 * Complete authentication flow or get next URL for navigation
 * - For OIDC flows with sessionId+requestId: completes flow directly via server action
 * - For other cases: returns default redirect or fallback URL
 */
export async function completeFlowAndRedirect(
  command: FinishFlowCommand,
  defaultRedirectUri?: string
) {
  // Complete OIDC flows directly with server action
  if (command.requestId && command.requestId.startsWith("oidc_")) {
    // This completes the flow and redirects to URL or returns error
    const result = await completeAuthFlow({
      sessionId: command.sessionId,
      requestId: command.requestId,
    });
    if ("redirect" in result) {
      redirect(result.redirect, "push");
    }
    return result;
  }

  // For all other cases, redirect to the url
  const requestId = "requestId" in command ? command.requestId : undefined;
  const url = await getNextUrl(defaultRedirectUri, requestId);
  redirect(url, "push");
}

/**
 * Returns the next URL for navigation after successful authentication
 *
 * @param command
 * @returns
 */
async function getNextUrl(defaultRedirectUri?: string, requestId?: string): Promise<string> {
  if (defaultRedirectUri) {
    return defaultRedirectUri;
  }

  return buildUrlWithRequestId("/account", requestId);
}

async function completeAuthFlow(command: {
  sessionId: string;
  requestId: string;
}): Promise<{ error: string } | { redirect: string }> {
  const { sessionId, requestId } = command;

  logMessage.info(
    `Completing ${requestId.startsWith("oidc_") ? "OIDC" : "unknown"} auth flow for requestId: ${requestId}`
  );

  const { sessions, sessionCookies } = await loadSessionsWithCookies({
    cleanup: true,
  });

  if (requestId.startsWith("oidc_")) {
    // Complete OIDC flow
    const result = await loginWithOIDCAndSession({
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
