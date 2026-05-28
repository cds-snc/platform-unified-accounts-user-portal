"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { Duration } from "@zitadel/client";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getActiveSessionCookie } from "@lib/cookies";
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { continueWithSession } from "@lib/server/session";
import { getLoginSettings } from "@lib/zitadel";

import { U2F_ERRORS } from "./u2f-errors";

type VerifyU2FLoginCommand = {
  loginName?: string;
  sessionId?: string;
  checks: Checks;
  requestId?: string;
  redirect?: string | null;
};

export async function verifyU2FLogin({ checks, requestId, redirect }: VerifyU2FLoginCommand) {
  const activeSessionCookie = await getActiveSessionCookie();

  // Get login settings to determine lifetime
  const loginSettings = await getLoginSettings();

  const lifetime = loginSettings?.multiFactorCheckLifetime ?? {
    seconds: BigInt(60 * 60 * 24), // default to 24 hours
    nanos: 0,
  };

  // Actually verify the U2F credential by updating the session with the checks
  const updatedSession = await setSessionAndUpdateCookie({
    activeCookie: activeSessionCookie,
    checks,
    requestId,
    lifetime: lifetime as Duration,
  });

  if (!updatedSession) {
    return { error: U2F_ERRORS.SESSION_VERIFICATION_FAILED };
  }

  return continueWithSession({ ...updatedSession, requestId, redirect });
}
