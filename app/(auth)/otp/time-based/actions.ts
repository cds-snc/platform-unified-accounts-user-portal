"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
import { validateTotpCode } from "@lib/client/validationSchemas";
import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { completeFlowAndRedirect } from "@lib/server/auth-flow";
import { updateSession } from "@lib/server/session";
import { getLoginSettings } from "@lib/zitadel";
import { getZitadelUiError } from "@lib/zitadel-errors";
import { serverTranslation } from "@i18n/server";
export type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    code?: string;
  };
};

type Inputs = {
  code: string;
};

export const handleOTPFormSubmit = AuthenticatedAction(
  async (_, code: string, requestId?: string): Promise<FormState> => {
    const { t } = await serverTranslation("otp");

    if (typeof code !== "string" || (requestId && typeof requestId !== "string")) {
      throw new Error("Invalid parameters");
    }

    const loginSettings = await getLoginSettings();

    const normalizedCode = code.trim();

    const totpValidationResult = await validateTotpCode({ code: normalizedCode });
    if (!totpValidationResult.success) {
      return {
        validationErrors: totpValidationResult.issues.map((issue) => ({
          fieldKey: (issue.path?.[0]?.key as string) || "code",
          fieldValue: t(`verify.validation.${issue.message}`),
        })),
        error: undefined,
        formData: { code: normalizedCode },
      };
    }

    const response = await _submitOTPCode({ code: normalizedCode }, requestId);

    if (!response) {
      return {
        validationErrors: undefined,
        error: undefined,
        formData: { code: normalizedCode },
      };
    }

    if ("error" in response) {
      const mappedUiError = getZitadelUiError("otp.verify", response.error);
      const mappedErrorMessage = mappedUiError ? t(mappedUiError.i18nKey) : undefined;

      logMessage.debug({
        message: "TOTP code submission returned error",
        error: response.error,
      });

      return {
        validationErrors: undefined,
        error:
          mappedErrorMessage ||
          (typeof response.error === "string" ? response.error : t("set.genericError")),
        formData: { code: normalizedCode },
      };
    }

    const redirectUrl = loginSettings?.defaultRedirectUri;

    // Always include sessionId to ensure we load the exact session that was just updated
    const callbackResponse = await completeFlowAndRedirect(
      {
        sessionId: response.sessionId,
        requestId: requestId,
      },
      redirectUrl
    );

    // If this code is reached there was an error in the completeFlowAndRedirect

    logMessage.debug({
      message: "TOTP callback flow returned error",
      error: callbackResponse.error,
    });
    return {
      validationErrors: undefined,
      formData: { code: normalizedCode },
      error: callbackResponse.error,
    };
  }
);

async function _submitOTPCode(values: Inputs, requestId?: string) {
  const checks = create(ChecksSchema, {
    totp: { code: values.code },
  });

  const response = await updateSession({
    checks,
    requestId,
  });

  if ("error" in response && response.error) {
    logMessage.debug({
      message: "TOTP code verification failed during session update",
      error: response.error,
    });
    return { error: response.error };
  }

  return response;
}
