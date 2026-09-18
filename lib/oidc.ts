/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { create } from "@zitadel/client";
import {
  CreateCallbackRequestSchema,
  SessionSchema,
} from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";

import { Cookie } from "@lib/cookies";
import { toAuthRequestId, toOidcRequestId } from "@lib/oidc-request-id";
import { createCallback, getAuthRequest } from "@lib/zitadel";

import { checkAuthenticationLevel } from "./server/route-protection";
import { logMessage } from "./logger";
import { isSessionValid, SessionWithAuthData } from "./session";
import { buildUrlWithRequestId } from "./utils";

type LoginWithOIDCAndSession = {
  authRequest: string;
  session: SessionWithAuthData | undefined;
  cookie: Cookie | undefined;
};
export async function loginWithOIDCAndSession({
  authRequest,
  session,
  cookie,
}: LoginWithOIDCAndSession): Promise<{ error: string } | { redirect: string }> {
  const authRequestId = toAuthRequestId(authRequest);
  const oidcRequestId = toOidcRequestId(authRequest);

  logMessage.info(`OIDC login attempt for requestId: ${oidcRequestId}`);

  if (!session || !cookie) {
    // No session detected redirecting
const startAuthUrl = buildUrlWithRequestId("/", oidcRequestId);
    return { redirect: startAuthUrl };
  }
  logMessage.debug(`Found session ${session?.id} for OIDC requestId: ${oidcRequestId}`);

  const isValid = await isSessionValid({
    session,
  });

  logMessage.debug(`OIDC session validity for requestId ${oidcRequestId}: ${isValid}`);

  if (!isValid) {
    logMessage.info(
      `OIDC session expired or incomplete for requestId: ${oidcRequestId}, redirecting for re-authentication`
    );
    // if the session is not valid anymore, we need to redirect the user to re-authenticate
    // Checking the authentication level will redirect the user to the appropriate page to add missing factors
    await checkAuthenticationLevel("mfa_required", session.requestId, { session });
  }

  try {
    const { callbackUrl } = await createCallback({
      req: create(CreateCallbackRequestSchema, {
        authRequestId,
        callbackKind: {
          case: "session",
          value: create(SessionSchema, { sessionId: session.id, sessionToken: cookie.token }),
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
          authRequestId,
        });

        if (authRequestData?.redirectUri) {
          return { redirect: authRequestData.redirectUri };
        }
      } catch (_authRequestError) {
        // Fall through to local portal fallback when auth request lookup fails.
      }

      // Final fallback keeps the user in a signed-in state within the portal.
      return { redirect: "/account" };
    } else {
      return { error: "Unknown error occurred" };
    }
  }
}
