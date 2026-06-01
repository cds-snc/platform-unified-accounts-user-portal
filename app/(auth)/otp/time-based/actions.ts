"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";

import { validateTotpCode } from "@lib/client/validationSchemas";
import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { completeFlowAndRedirect } from "@lib/server/auth-flow";
import { updateSession } from "@lib/server/session";
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

type SubmitCodeParams = {
  requestId?: string;
  redirect?: string | null;
};

type SessionResponse = {
  sessionId?: string;
  factors?: {
    user?: {
      loginName: string;
      organizationId?: string;
    };
  };
  error?: unknown;
};

export async function handleOTPFormSubmit(
  code: string,
  params: SubmitCodeParams & {
    loginSettings?: LoginSettings;
  }
): Promise<FormState & { redirect?: string }> {
  const { t } = await serverTranslation("otp");
  const { loginSettings, ...submitParams } = params;
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

  const response = await _submitOTPCode({ code: normalizedCode }, submitParams);

  if (!response) {
    return {
      validationErrors: undefined,
      error: undefined,
      formData: { code: normalizedCode },
    };
  }

  if (response.error) {
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

  if (response.sessionId && response.factors?.user) {
    // Wait for 2 seconds to avoid eventual consistency issues with an OTP code being verified in the /login endpoint
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const redirectUrl = submitParams.redirect || loginSettings?.defaultRedirectUri;

    // Always include sessionId to ensure we load the exact session that was just updated
    const callbackResponse = await completeFlowAndRedirect(
      submitParams.requestId
        ? {
            sessionId: response.sessionId,
            requestId: submitParams.requestId,
          }
        : {
            sessionId: response.sessionId,
            loginName: response.factors.user.loginName,
          },
      redirectUrl
    );

    if ("error" in callbackResponse) {
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
  }

  return {
    validationErrors: undefined,
    error: undefined,
    formData: { code: normalizedCode },
  };
}

async function _submitOTPCode(
  values: Inputs,
  params: SubmitCodeParams
): Promise<SessionResponse | undefined> {
  const { requestId } = params;

  const checks = create(ChecksSchema, {
    totp: { code: values.code },
  });

  try {
    const response = await updateSession({
      checks,
      requestId,
    });

    if (response && "error" in response && response.error) {
      logMessage.debug({
        message: "TOTP code verification failed during session update",
        error: response.error,
      });
      return { error: response.error };
    }

    return response;
  } catch (error) {
    logMessage.debug({
      message: "TOTP code verification failed with unexpected error",
      error,
    });
    return { error };
  }
}
