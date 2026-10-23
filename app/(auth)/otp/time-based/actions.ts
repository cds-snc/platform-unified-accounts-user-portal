"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { completeFlowAndRedirect } from "@lib/server/auth-flow";
import { updateSession } from "@lib/server/session";
import { validateTotpCode } from "@lib/validation/validationSchemas";
import { getZitadelUiError, type ZitadelErrorKey } from "@lib/zitadel-errors";
import { serverTranslation } from "@i18n/server";
export type FormState = {
  // Translated on the client so the message always matches the language the user is viewing.
  errorKey?: ZitadelErrorKey;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    code?: string;
  };
};

type Inputs = {
  code: string;
};

export const handleOTPFormSubmit = AuthenticatedAction(
  { authLevel: "basic_session" },
  async function handleOTPFormSubmit(
    _,
    { code, requestId }: { code: string; requestId?: string }
  ): Promise<FormState> {
    const { t } = await serverTranslation("otp");

    if (typeof code !== "string" || (requestId && typeof requestId !== "string")) {
      throw new Error("Invalid parameters");
    }

    const normalizedCode = code.trim();

    const totpValidationResult = await validateTotpCode({ code: normalizedCode });
    if (!totpValidationResult.success) {
      return {
        validationErrors: totpValidationResult.issues.map((issue) => ({
          fieldKey: (issue.path?.[0]?.key as string) || "code",
          fieldValue: t(`verify.validation.${issue.message}`),
        })),
        formData: { code: normalizedCode },
      };
    }

    const response = await _submitOTPCode({ code: normalizedCode }, requestId);

    if (!response) {
      return {
        validationErrors: undefined,
        formData: { code: normalizedCode },
      };
    }

    if ("error" in response) {
      logMessage.debug({
        message: "TOTP code submission returned error",
        error: response.error,
      });

      return {
        validationErrors: undefined,
        errorKey: getZitadelUiError("otp.verify", response.error).errorKey,
        formData: { code: normalizedCode },
      };
    }

    // Always include sessionId to ensure we load the exact session that was just updated
    const callbackResponse = await completeFlowAndRedirect({
      sessionId: response.sessionId,
      requestId: requestId,
    });

    // If this code is reached there was an error in the completeFlowAndRedirect

    logMessage.debug({
      message: "TOTP callback flow returned error",
      error: callbackResponse.error,
    });
    return {
      validationErrors: undefined,
      formData: { code: normalizedCode },
      errorKey: "set.genericError",
    };
  }
);

async function _submitOTPCode(values: Inputs, requestId?: string) {
  const checks = create(ChecksSchema, {
    totp: { code: values.code },
  });

  return updateSession({
    checks,
    requestId,
  }).catch((e) => {
    logMessage.debug({
      message: "TOTP code verification failed during session update",
      error: e,
    });
    // Keep the original error object so getZitadelUiError can parse its details.
    return { error: e as unknown };
  });
}
