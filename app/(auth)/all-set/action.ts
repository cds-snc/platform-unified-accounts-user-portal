"use server";
import { AuthenticatedAction } from "@lib/actions/authenticated";
import { completeFlowAndRedirect } from "@lib/server/auth-flow";

export const nextRedirect = AuthenticatedAction(
  { authLevel: "mfa_required" },
  async function nextRedirect(session) {
    return completeFlowAndRedirect({
      sessionId: session.id,
      requestId: session.requestId,
    });
  }
);
