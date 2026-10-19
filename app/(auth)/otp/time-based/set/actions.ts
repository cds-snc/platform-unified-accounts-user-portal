"use server";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { AuthLevel } from "@lib/server/route-protection";
import { updateSession } from "@lib/server/session";
import { buildUrlWithRequestId } from "@lib/utils";
import { validateTotpCode } from "@lib/validation/validationSchemas";
import { verifyTOTPRegistration } from "@lib/zitadel";
import { getTotpVerifyErrorKey, type TotpVerifyErrorKey } from "@lib/zitadel-errors";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

// Errors are returned rather than thrown: a thrown error is masked by AuthenticatedAction
// and surfaces as a failed action instead of an inline message.
export const verifyAndRegisterTOTP = AuthenticatedAction(
  { authLevel: AuthLevel.MFA_CHANGE_REQUIRED },
  async function verifyAndRegisterTOTP(
    session,
    {
      code,
      requestId,
      checkAfter = false,
    }: {
      code: string;
      requestId?: string;
      checkAfter?: boolean;
    }
  ): Promise<{ errorKey: TotpVerifyErrorKey }> {
    const normalizedCode = code.trim();

    const validationResult = await validateTotpCode({ code: normalizedCode });
    if (!validationResult.success) {
      return { errorKey: "set.invalidCodeLength" };
    }

    try {
      await verifyTOTPRegistration({
        code: normalizedCode,
        userId: session.factors.user.id,
      });

      if (checkAfter) {
        // Reuse the just-entered TOTP code to verify the active session inline.
        const checks = create(ChecksSchema, {
          totp: { code: normalizedCode },
        });

        // Mark second-factor checks complete for this session during setup.
        const sessionResponse = await updateSession({
          checks,
          requestId,
        });

        if (sessionResponse && "error" in sessionResponse && sessionResponse.error) {
          throw sessionResponse.error;
        }
      }
    } catch (error) {
      logMessage.debug({
        message: "TOTP registration verification failed",
        error,
      });
      return { errorKey: getTotpVerifyErrorKey(error) };
    }

    // redirect() throws, so it must stay outside the try/catch above.
    const url = buildUrlWithRequestId("/all-set", requestId);
    redirect(url);
  }
);
