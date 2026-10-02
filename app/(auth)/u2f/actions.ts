"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import {
  RequestChallengesSchema,
  UserVerificationRequirement,
} from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getActiveSessionCookie } from "@lib/cookies";
import { completeFlowAndRedirect } from "@lib/server/auth-flow";
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { updateSession } from "@lib/server/session";
import {
  type PublicKeyCredentialAssertionData,
  validateRequestId,
  validateU2FLoginCommand,
} from "@lib/validation/validationSchemas";

import { U2F_ERRORS } from "./u2f-errors";

type VerifyU2FLoginCommand = {
  publicKeyCredential: PublicKeyCredentialAssertionData;
  requestId?: string;
  completeFlow?: boolean;
};

export const verifyU2FLogin = AuthenticatedAction(
  { authLevel: "basic_session" },
  async function verifyU2FLogin(_, command: VerifyU2FLoginCommand) {
    const loginValidation = validateU2FLoginCommand(command);
    if (!loginValidation.success) {
      return { error: U2F_ERRORS.SESSION_VERIFICATION_FAILED };
    }

    const { publicKeyCredential, requestId, completeFlow = true } = loginValidation.output;
    const activeSessionCookie = await getActiveSessionCookie();
    const checks = create(ChecksSchema, {
      webAuthN: { credentialAssertionData: publicKeyCredential },
    });

    // Actually verify the U2F credential by updating the session with the checks
    const updatedSession = await setSessionAndUpdateCookie({
      activeCookie: activeSessionCookie,
      checks,
      requestId,
    }).catch((_error) => {
      return undefined;
    });

    if (!updatedSession) {
      return { error: U2F_ERRORS.SESSION_VERIFICATION_FAILED };
    }
    if (completeFlow) {
      return completeFlowAndRedirect({
        sessionId: updatedSession.id,
        requestId: requestId,
      });
    }
  }
);

export const updateSessionForU2FChallenge = AuthenticatedAction(
  { authLevel: "basic_session" },
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
