/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

import { redirect } from "next/navigation";

import { logMessage } from "@lib/logger";
import { loginWithOIDCAndSession } from "@lib/oidc";
import { loadActiveSession } from "@lib/session";

import { buildUrlWithRequestId } from "../utils";

import { checkSessionFactors } from "./route-protection";
import { getSessionWithCookie } from "./session";

type FinishFlowCommand = {
  sessionId: string;
  requestId?: string;
};

/**
 * Complete authentication flow or get next URL for navigation
 * - For OIDC flows with sessionId+requestId: completes flow directly via server action
 * - For other cases: returns default redirect or fallback URL
 */
export async function completeFlowAndRedirect(command: FinishFlowCommand) {
  await shouldDeferOIDCCompletion(command.requestId);

  if (command.requestId && command.requestId.startsWith("oidc_")) {
    const result = await completeAuthFlow({
      sessionId: command.sessionId,
      requestId: command.requestId,
    });
    if ("redirect" in result) {
      redirect(result.redirect, "push");
    }
    return result;
  }

  redirect("/account", "push");
}

async function completeAuthFlow(command: {
  sessionId: string;
  requestId: string;
}): Promise<{ error: string } | { redirect: string }> {
  const { sessionId, requestId } = command;

  logMessage.info(
    `Completing ${requestId.startsWith("oidc_") ? "OIDC" : "unknown"} auth flow for requestId: ${requestId}`
  );

  const { session, cookie } = await getSessionWithCookie({ sessionId, cleanup: true });

  if (requestId.startsWith("oidc_")) {
    // Complete OIDC flow
    const result = await loginWithOIDCAndSession({
      authRequest: requestId.replace("oidc_", ""),
      session,
      cookie,
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

/**
 * Checks if OIDC completion should be deferred based on a given redirect.
 * Handles cases where the session is not yet fully established (e.g., during password reset).
 *
 * @param redirect
 * @returns
 */
async function shouldDeferOIDCCompletion(requestId?: string) {
  const session = await loadActiveSession();
  const factors = checkSessionFactors(session);
  const mfaVerified = factors.totpVerified || factors.u2fVerified;

  // On password reset flow, redirect to next auth flow step without completing
  if (mfaVerified && factors.emailVerified && !factors.passwordVerified) {
    redirect(buildUrlWithRequestId("/password/reset/set", requestId), "push");
  }

  return;
}
