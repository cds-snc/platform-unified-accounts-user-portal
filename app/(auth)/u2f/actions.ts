"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import {
  RequestChallengesSchema,
  UserVerificationRequirement,
} from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getActiveSessionCookie } from "@lib/cookies";
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { updateSession } from "@lib/server/session";
import { continueWithSession } from "@lib/server/session";
import { validateRequestId, validateU2FLoginCommand } from "@lib/validation/validationSchemas";

import { U2F_ERRORS } from "./u2f-errors";

type VerifyU2FLoginCommand = {
  loginName?: string;
  sessionId?: string;
  checks: Checks;
  requestId?: string;
  redirect?: string | null;
};

export const verifyU2FLogin = AuthenticatedAction(
  "basic_session",
  async function verifyU2FLogin(_, { checks, requestId, redirect }: VerifyU2FLoginCommand) {
    const loginValidation = validateU2FLoginCommand({ requestId, redirect });
    if (!loginValidation.success) {
      return { error: U2F_ERRORS.SESSION_VERIFICATION_FAILED };
    }

    const activeSessionCookie = await getActiveSessionCookie();

    // Actually verify the U2F credential by updating the session with the checks
    const updatedSession = await setSessionAndUpdateCookie({
      activeCookie: activeSessionCookie,
      checks,
      requestId,
    });

    if (!updatedSession) {
      return { error: U2F_ERRORS.SESSION_VERIFICATION_FAILED };
    }

    return continueWithSession({ ...updatedSession, requestId, redirect });
  }
);

export const updateSessionForU2FChallenge = AuthenticatedAction(
  "basic_session",
  async function updateSessionForU2FChallenge(_, requestId?: string) {
    const validationResult = validateRequestId(requestId);
    if (!validationResult.success) {
      throw new Error("Invalid Parameters");
    }
    const session = await updateSession({
      challenges: create(RequestChallengesSchema, {
        webAuthN: {
          userVerificationRequirement: UserVerificationRequirement.DISCOURAGED,
        },
      }),
      requestId,
    });

    return session;
  }
);
