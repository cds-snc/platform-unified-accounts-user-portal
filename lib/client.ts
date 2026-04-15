/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { completeAuthFlow } from "./server/auth-flow";
import { buildUrlWithRequestId } from "./utils";
type FinishFlowCommand =
  | {
      sessionId: string;
      requestId: string;
    }
  | { loginName: string; sessionId?: string };

/**
 * Complete authentication flow or get next URL for navigation
 * - For OIDC flows with sessionId+requestId: completes flow directly via server action
 * - For other cases: returns default redirect or fallback URL
 */
export async function completeFlowOrGetUrl(
  command: FinishFlowCommand & { organization?: string },
  defaultRedirectUri?: string
): Promise<{ redirect: string } | { error: string }> {
  // Complete OIDC flows directly with server action
  if ("sessionId" in command && "requestId" in command && command.requestId.startsWith("oidc_")) {
    // This completes the flow and returns a redirect URL or error
    const result = await completeAuthFlow({
      sessionId: command.sessionId,
      requestId: command.requestId,
    });
    return result;
  }

  // For all other cases, return URL for navigation
  const requestId = "requestId" in command ? command.requestId : undefined;
  const url = await getNextUrl(command, defaultRedirectUri, requestId);
  const result = { redirect: url };
  return result;
}

/**
 * Returns the next URL for navigation after successful authentication
 * Note: OIDC flows now use completeAuthFlowAction() instead of URL navigation
 * @param command
 * @returns
 */
export async function getNextUrl(
  command: FinishFlowCommand & { organization?: string },
  defaultRedirectUri?: string,
  requestId?: string
): Promise<string> {
  // OIDC flows are now handled by completeAuthFlowAction() server action

  if (defaultRedirectUri) {
    return defaultRedirectUri;
  }

  return buildUrlWithRequestId("/account", requestId);
}
