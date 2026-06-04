"use server";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
import { validateTotpCode } from "@lib/client/validationSchemas";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { updateSession } from "@lib/server/session";
import { buildUrlWithRequestId } from "@lib/utils";
import { verifyTOTPRegistration } from "@lib/zitadel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

export const verifiyAndRegisterTOTP = AuthenticatedAction(
  async (
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
  ) => {
    const normalizedCode = code.trim();

    await validateTotpCode({ code: normalizedCode }).then((result) => {
      if (!result.success) {
        // Not returning a pretty error as this validation would be caught on the client
        // during normal processing
        throw new Error("Invalid TOTP Code Format");
      }
    });

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
    const url = buildUrlWithRequestId("/all-set", requestId);
    redirect(url);
  }
);
