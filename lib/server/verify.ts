"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { cookies, headers } from "next/headers";
import { GCNotifyConnector } from "@gcforms/connectors";
import { create } from "@zitadel/client";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import crypto from "crypto";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getPasswordChangedTemplate, getSecurityCodeTemplate } from "@lib/emailTemplates";
import {
  addOTPEmail,
  getLoginSettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
  sendEmailCodeWithReturn,
  verifyEmail,
  verifyTOTPRegistration,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { logMessage } from "../../lib/logger";
import { createSessionAndUpdateCookie } from "../../lib/server/cookie";
import { getServiceUrlFromHeaders } from "../../lib/service-url";
import { completeFlowOrGetUrl } from "../client";
import { getSessionCookieByLoginName } from "../cookies";
import { getOrSetFingerprintId } from "../fingerprint";
import { loadMostRecentSession } from "../session";
import { buildUrlWithRequestId } from "../utils";
import { checkMFAFactors } from "../verify-helper";

export async function verifyTOTP(code: string, loginName?: string, organization?: string) {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  try {
    const session = await loadMostRecentSession({
      serviceUrl,
      sessionParams: {
        loginName,
        organization,
      },
    });

    if (!session?.factors?.user?.id) {
      return { error: new Error("No user id found in session.") };
    }

    await verifyTOTPRegistration({
      serviceUrl,
      code,
      userId: session.factors.user.id,
    });

    return { success: true };
  } catch (error) {
    return { error };
  }
}

type VerifyUserByEmailCommand = {
  userId: string;
  loginName?: string; // to determine already existing session
  organization?: string;
  code: string;
  requestId?: string;
};

export async function sendVerification(command: VerifyUserByEmailCommand) {
  const { t } = await serverTranslation("verify");
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const verifyResponse = await verifyEmail({
    serviceUrl,
    userId: command.userId,
    verificationCode: command.code,
  }).catch((error) => {
    logMessage.debug({ error, message: "Failed to verify email" });
    return { error: t("errors.couldNotVerifyEmail") };
  });

  if ("error" in verifyResponse) {
    return verifyResponse;
  }

  if (!verifyResponse) {
    return { error: t("errors.couldNotVerify") };
  }

  // Automatically add OTPEmail as an authentication method after email verification
  try {
    await addOTPEmail({
      serviceUrl,
      userId: command.userId,
    });
  } catch (error) {
    logMessage.debug({ error, message: "Failed to add OTPEmail" });
    return { error: t("errors.failedToAddOTPEmail") };
  }

  let session: Session | undefined;
  const userResponse = await getUserByID({
    serviceUrl,
    userId: command.userId,
  });

  if (!userResponse || !userResponse.user) {
    return { error: t("errors.couldNotLoadUser") };
  }

  const user = userResponse.user;

  const sessionCookie = await getSessionCookieByLoginName({
    loginName: command.loginName ?? user.preferredLoginName,
    organization: command.organization,
  }).catch(() => {
    // Ignored error, checked later
  });

  if (sessionCookie) {
    session = await getSession({
      serviceUrl,
      sessionId: sessionCookie.id,
      sessionToken: sessionCookie.token,
    }).then((response) => {
      if (response?.session) {
        return response.session;
      }
    });
  }

  // load auth methods for user
  const authMethodResponse = await listAuthenticationMethodTypes({
    serviceUrl,
    userId: user.userId,
  });

  if (!authMethodResponse || !authMethodResponse.authMethodTypes) {
    return { error: t("errors.couldNotLoadAuthenticators") };
  }

  // Filter to check if user has U2F or TOTP (OTPEmail alone is not sufficient)
  const hasStrongMFA =
    authMethodResponse.authMethodTypes?.some(
      (method) =>
        method === AuthenticationMethodType.U2F || method === AuthenticationMethodType.TOTP
    ) || false;

  // If user doesn't have U2F or TOTP, redirect them to set one up
  if (!hasStrongMFA) {
    if (!sessionCookie) {
      const checks = create(ChecksSchema, {
        user: {
          search: {
            case: "loginName",
            value: userResponse.user.preferredLoginName,
          },
        },
      });

      session = await createSessionAndUpdateCookie({
        checks,
        requestId: command.requestId,
      });
    }

    if (!session) {
      logMessage.debug({
        userId: command.userId,
        message: "Failed to create session for MFA setup",
      });
      return { error: t("errors.couldNotCreateSession") };
    }

    // set hash of userId and userAgentId to prevent attacks
    const cookiesList = await cookies();
    const userAgentId = await getOrSetFingerprintId();

    const verificationCheck = crypto
      .createHash("sha256")
      .update(`${user.userId}:${userAgentId}`)
      .digest("hex");

    await cookiesList.set({
      name: "verificationCheck",
      value: verificationCheck,
      httpOnly: true,
      path: "/",
      maxAge: 300, // 5 minutes
    });

    return { redirect: buildUrlWithRequestId("/verify/success", command.requestId) };
  }

  // Session required to proceed with MFA verification
  if (!session?.factors?.user?.id) {
    return { error: t("errors.couldNotCreateSession") };
  }

  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization: user.details?.resourceOwner,
  });

  // redirect to mfa factor if user has one, or redirect to set one up
  const mfaFactorCheck = await checkMFAFactors(
    serviceUrl,
    session,
    loginSettings,
    authMethodResponse.authMethodTypes,
    command.requestId
  );

  if (mfaFactorCheck && "redirect" in mfaFactorCheck) {
    return mfaFactorCheck;
  }

  // login user if no additional steps are required
  if (command.requestId && session.id) {
    return completeFlowOrGetUrl(
      {
        sessionId: session.id,
        requestId: command.requestId,
        organization: command.organization ?? session.factors?.user?.organizationId,
      },
      loginSettings?.defaultRedirectUri
    );
  }

  // Regular flow - return URL for client-side navigation
  return completeFlowOrGetUrl(
    {
      loginName: session.factors.user.loginName,
      organization: session.factors?.user?.organizationId,
    },
    loginSettings?.defaultRedirectUri
  );
}

type SendVerificationEmailCommand = {
  userId: string;
};

export async function sendVerificationEmail(command: SendVerificationEmailCommand) {
  const { t } = await serverTranslation("verify");
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  // Get verification code from Zitadel (returnCode mode - does not send email)
  const codeResponse = await sendEmailCodeWithReturn({
    serviceUrl,
    userId: command.userId,
  }).catch((error) => {
    logMessage.debug({ error, message: "Failed to get verification code" });
    return { error: t("errors.couldNotGenerateCode") };
  });

  if ("error" in codeResponse) {
    return codeResponse;
  }

  if (!codeResponse.verificationCode) {
    return { error: t("errors.couldNotGenerateCode") };
  }

  // Get user's email address
  const userResponse = await getUserByID({
    serviceUrl,
    userId: command.userId,
  });

  if (!userResponse?.user) {
    return { error: t("errors.couldNotLoadUser") };
  }

  const user = userResponse.user;
  let email: string | undefined;

  if (user.type.case === "human") {
    email = user.type.value.email?.email;
  }

  if (!email) {
    return { error: t("errors.couldNotLoadUserEmail") };
  }

  // Send email via GC Notify
  const apiKey = process.env.NOTIFY_API_KEY;
  const templateId = process.env.TEMPLATE_ID;

  if (!apiKey || !templateId) {
    return { error: t("errors.emailConfigurationError") };
  }

  try {
    const gcNotify = GCNotifyConnector.default(apiKey);
    await gcNotify.sendEmail(
      email,
      templateId,
      getSecurityCodeTemplate(codeResponse.verificationCode)
    );

    return { success: true };
  } catch (error) {
    logMessage.debug({ error, message: "Failed to send verification email" });
    return { error: t("errors.emailSendFailed") };
  }
}

type SendPasswordChangedEmailCommand = {
  userId: string;
};

export async function sendPasswordChangedEmail(command: SendPasswordChangedEmailCommand) {
  const { t } = await serverTranslation("password");
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  // Get user's email address
  const userResponse = await getUserByID({
    serviceUrl,
    userId: command.userId,
  });

  if (!userResponse?.user) {
    return { error: t("errors.couldNotLoadUser") };
  }

  const user = userResponse.user;
  let email: string | undefined;

  if (user.type.case === "human") {
    email = user.type.value.email?.email;
  }

  if (!email) {
    return { error: t("errors.couldNotLoadUserEmail") };
  }

  // Send email via GC Notify
  const apiKey = process.env.NOTIFY_API_KEY;
  const templateId = process.env.TEMPLATE_ID;

  if (!apiKey || !templateId) {
    return { error: t("errors.emailConfigurationError") };
  }

  try {
    const gcNotify = GCNotifyConnector.default(apiKey);
    await gcNotify.sendEmail(email, templateId, getPasswordChangedTemplate());

    return { success: true };
  } catch (error) {
    logMessage.debug({ error, message: "Failed to send password changed email" });
    return { error: t("errors.emailSendFailed") };
  }
}
