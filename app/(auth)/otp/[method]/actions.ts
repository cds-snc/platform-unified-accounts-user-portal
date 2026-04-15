"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ENABLE_EMAIL_OTP } from "@root/constants/config";
import { completeFlowOrGetUrl } from "@lib/client";
import { logMessage } from "@lib/logger";
import { sendOtpEmail } from "@lib/server/otp";
import { updateSession } from "@lib/server/session";
import { validateCode, validateTotpCode } from "@lib/validationSchemas";
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
  loginName?: string;
  sessionId?: string;
  organization?: string;
  requestId?: string;
  method: string;
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

type OTPChallengeParams = {
  loginName?: string;
  sessionId?: string;
  organization?: string;
  requestId?: string;
  method: string;
};

export async function updateSessionForOTPChallenge(
  params: OTPChallengeParams
): Promise<{ error?: string; response?: SessionResponse }> {
  const { loginName, sessionId, organization, requestId, method } = params;

  if (method === "email" && !ENABLE_EMAIL_OTP) {
    return { error: "OTP email is disabled" };
  }

  logMessage.debug({
    message: "Requesting OTP challenge",
    method,
    hasLoginName: !!loginName,
    hasSessionId: !!sessionId,
    hasOrganization: !!organization,
    hasRequestId: !!requestId,
  });

  // For email OTP, use GC Notify to send the code
  if (method === "email") {
    const result = await sendOtpEmail({
      loginName,
      sessionId,
      organization,
      requestId,
    });

    if (result.error) {
      logMessage.debug({
        message: "OTP email challenge request failed",
        error: result.error,
      });
      return { error: result.error };
    }

    if (result.success) {
      logMessage.debug({
        message: "OTP email challenge request succeeded",
        hasSessionId: !!result.sessionId,
      });
      return {
        response: {
          sessionId: result.sessionId,
          factors: result.factors,
        },
      };
    }

    return { error: "Failed to send OTP email" };
  }

  // For SMS OTP, we don't have challenges to set
  try {
    const response = await updateSession({
      loginName,
      sessionId,
      organization,
      requestId,
    });

    if (response && "error" in response && response.error) {
      let normalizedError = "Could not update session";

      if (typeof response.error === "string") {
        normalizedError = response.error;
      } else if (
        response.error &&
        typeof response.error === "object" &&
        "message" in response.error &&
        typeof response.error.message === "string"
      ) {
        normalizedError = response.error.message;
      }

      return {
        error: normalizedError,
      };
    }

    return { response };
  } catch {
    logMessage.debug({
      message: "OTP challenge request failed during session update",
      method,
    });
    return { error: "Could not update session" };
  }
}

export async function handleOTPFormSubmit(
  code: string,
  params: SubmitCodeParams & {
    loginSettings?: LoginSettings;
  }
): Promise<FormState & { redirect?: string }> {
  const { t } = await serverTranslation("otp");
  const { loginSettings, ...submitParams } = params;
  const normalizedCode = code.trim();

  if (submitParams.method === "email" && !ENABLE_EMAIL_OTP) {
    return {
      validationErrors: undefined,
      error: t("set.genericError"),
      formData: { code: normalizedCode },
    };
  }

  try {
    if (submitParams.method === "time-based") {
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
    }

    if (submitParams.method !== "time-based") {
      // Validate non-TOTP code entries and map any errors to form state with translated messages
      const validationResult = await validateCode({ code: normalizedCode });
      if (!validationResult.success) {
        return {
          validationErrors: validationResult.issues.map((issue) => ({
            fieldKey: (issue.path?.[0]?.key as string) || "code",
            fieldValue: t(`verify.validation.${issue.message}`),
          })),
          error: undefined,
          formData: { code: normalizedCode },
        };
      }
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
        message: "OTP code submission returned error",
        method: submitParams.method,
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
      const callbackResponse = await completeFlowOrGetUrl(
        submitParams.requestId
          ? {
              sessionId: response.sessionId,
              requestId: submitParams.requestId,
              organization: response.factors.user.organizationId,
            }
          : {
              sessionId: response.sessionId,
              loginName: response.factors.user.loginName,
              organization: response.factors.user.organizationId,
            },
        redirectUrl
      );

      if ("error" in callbackResponse) {
        logMessage.debug({
          message: "OTP callback flow returned error",
          method: submitParams.method,
          error: callbackResponse.error,
        });
        return {
          validationErrors: undefined,
          formData: { code: normalizedCode },
          error: callbackResponse.error,
        };
      }

      if ("redirect" in callbackResponse) {
        logMessage.debug({
          message: "OTP callback flow returned redirect",
          method: submitParams.method,
          redirect: callbackResponse.redirect,
        });
        return {
          validationErrors: undefined,
          error: undefined,
          formData: { code: normalizedCode },
          redirect: callbackResponse.redirect,
        };
      }
    }

    return {
      validationErrors: undefined,
      error: undefined,
      formData: { code: normalizedCode },
    };
  } catch (error) {
    logMessage.debug({
      message: "OTP form submit failed with unexpected error",
      method: submitParams.method,
      error,
    });

    return {
      validationErrors: undefined,
      error: t("set.genericError"),
      formData: { code: normalizedCode },
    };
  }
}

async function _submitOTPCode(
  values: Inputs,
  params: SubmitCodeParams
): Promise<SessionResponse | undefined> {
  const { loginName, sessionId, organization, requestId, method } = params;

  let checks;

  if (method === "email") {
    checks = create(ChecksSchema, {
      otpEmail: { code: values.code },
    });
  }
  if (method === "time-based") {
    checks = create(ChecksSchema, {
      totp: { code: values.code },
    });
  }

  try {
    const response = await updateSession({
      loginName,
      sessionId,
      organization,
      checks,
      requestId,
    });

    if (response && "error" in response && response.error) {
      logMessage.debug({
        message: "OTP code verification failed during session update",
        method,
        error: response.error,
      });
      return { error: response.error };
    }

    return response;
  } catch (error) {
    logMessage.debug({
      message: "OTP code verification failed with unexpected error",
      method,
      error,
    });
    return { error };
  }
}
