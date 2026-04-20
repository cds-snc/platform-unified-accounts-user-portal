/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { create } from "@zitadel/client";
import {
  CreateCallbackRequestSchema,
  SessionSchema,
} from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";

import { Cookie } from "@lib/cookies";
import { toAuthRequestId, toOidcRequestId } from "@lib/oidc-request-id";
import { sendLoginname, SendLoginnameCommand } from "@lib/server/loginname";
import { createCallback, getAuthRequest, getLoginSettings } from "@lib/zitadel";

import { logMessage } from "./logger";
import { isSessionValid } from "./session";

type LoginWithOIDCAndSession = {
  serviceUrl: string;
  authRequest: string;
  sessionId: string;
  sessions: Session[];
  sessionCookies: Cookie[];
};
export async function loginWithOIDCAndSession({
  serviceUrl,
  authRequest,
  sessionId,
  sessions,
  sessionCookies,
}: LoginWithOIDCAndSession): Promise<{ error: string } | { redirect: string }> {
  const authRequestId = toAuthRequestId(authRequest);
  const oidcRequestId = toOidcRequestId(authRequest);

  logMessage.info(`OIDC login attempt for requestId: ${oidcRequestId}`);

  const selectedSession = sessions.find((s) => s.id === sessionId);

  if (selectedSession && selectedSession.id) {
    logMessage.debug(`Found session ${selectedSession.id} for OIDC requestId: ${oidcRequestId}`);

    const isValid = await isSessionValid({
      serviceUrl,
      session: selectedSession,
    });

    logMessage.debug(`OIDC session validity for requestId ${oidcRequestId}: ${isValid}`);

    if (!isValid && selectedSession.factors?.user) {
      logMessage.info(
        `OIDC session expired for requestId: ${oidcRequestId}, redirecting for re-authentication`
      );
      // if the session is not valid anymore, we need to redirect the user to re-authenticate /
      // TODO: handle IDP intent direcly if available
      const command: SendLoginnameCommand = {
        loginName: selectedSession.factors.user?.loginName,
        organization: selectedSession.factors?.user?.organizationId,
        requestId: oidcRequestId,
      };

      const res = await sendLoginname(command);

      if (res && "redirect" in res && res?.redirect) {
        logMessage.debug(`Re-authentication redirect initiated for requestId: ${oidcRequestId}`);
        return { redirect: res.redirect };
      }
    }

    const cookie = sessionCookies.find((cookie) => cookie.id === selectedSession?.id);

    if (cookie && cookie.id && cookie.token) {
      const session = {
        sessionId: cookie?.id,
        sessionToken: cookie?.token,
      };

      try {
        const { callbackUrl } = await createCallback({
          serviceUrl,
          req: create(CreateCallbackRequestSchema, {
            authRequestId,
            callbackKind: {
              case: "session",
              value: create(SessionSchema, session),
            },
          }),
        });
        if (callbackUrl) {
          logMessage.info(`OIDC authentication complete for requestId: ${oidcRequestId}`);
          return { redirect: callbackUrl };
        } else {
          return { error: "An error occurred!" };
        }
      } catch (error: unknown) {
        // handle already handled gracefully as these could come up if old emails with requestId are used (reset password, register emails etc.)
        logMessage.error("OIDC authentication error", error);
        if (error && typeof error === "object" && "code" in error && error?.code === 9) {
          // Already-handled auth requests can happen due to retries or duplicate RSC renders.
          // In that case, recover with a deterministic redirect to the relying party when possible.
          try {
            const { authRequest: authRequestData } = await getAuthRequest({
              serviceUrl,
              authRequestId,
            });

            if (authRequestData?.redirectUri) {
              return { redirect: authRequestData.redirectUri };
            }
          } catch (_authRequestError) {
            // Fall through to login settings fallback when auth request lookup fails.
          }

          const loginSettings = await getLoginSettings({
            serviceUrl,
            organization: selectedSession.factors?.user?.organizationId,
          });

          if (loginSettings?.defaultRedirectUri) {
            return { redirect: loginSettings.defaultRedirectUri };
          }

          // Final fallback keeps the user in a signed-in state within the portal.
          return { redirect: "/account" };
        } else {
          return { error: "Unknown error occurred" };
        }
      }
    }
  }

  // If no session found or no valid cookie, return error
  return { error: "Session not found or invalid" };
}
