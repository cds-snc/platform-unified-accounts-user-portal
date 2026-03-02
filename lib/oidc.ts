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
import { createCallback } from "@lib/zitadel";

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

  console.log(`Login with session: ${sessionId} and authRequest: ${authRequest}`);

  const selectedSession = sessions.find((s) => s.id === sessionId);

  if (selectedSession && selectedSession.id) {
    console.log(`Found session ${selectedSession.id}`);

    const isValid = await isSessionValid({
      serviceUrl,
      session: selectedSession,
    });

    console.log("Session is valid:", isValid);

    if (!isValid && selectedSession.factors?.user) {
      console.log("Session is not valid, need to re-authenticate user");
      // if the session is not valid anymore, we need to redirect the user to re-authenticate /
      // TODO: handle IDP intent direcly if available
      const command: SendLoginnameCommand = {
        loginName: selectedSession.factors.user?.loginName,
        organization: selectedSession.factors?.user?.organizationId,
        requestId: oidcRequestId,
      };

      const res = await sendLoginname(command);

      if (res && "redirect" in res && res?.redirect) {
        console.log("Redirecting to re-authenticate:", res.redirect);
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
          console.log("Redirecting to callback URL:", callbackUrl);
          return { redirect: callbackUrl };
        } else {
          return { error: "An error occurred!" };
        }
      } catch (error: unknown) {
        // handle already handled gracefully as these could come up if old emails with requestId are used (reset password, register emails etc.)
        console.error(error);
        if (error && typeof error === "object" && "code" in error && error?.code === 9) {
          // Auth request already handled - signal this so the caller can redirect to login for a fresh flow
          return { error: "Auth request already handled" };
        } else {
          return { error: "Unknown error occurred" };
        }
      }
    }
  }

  // If no session found or no valid cookie, return error
  return { error: "Session not found or invalid" };
}
