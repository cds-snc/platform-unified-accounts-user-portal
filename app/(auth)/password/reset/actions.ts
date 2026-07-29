"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";
import { GCNotifyConnector } from "@gcforms/connectors";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getPasswordResetTemplate } from "@lib/emailTemplates";
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { passwordResetWithCode, verifyPassword } from "@lib/server/password";
import { buildUrlWithRequestId } from "@lib/utils";
import {
  validateCode,
  validatePassword,
  validateUsername,
} from "@lib/validation/validationSchemas";
import { listAuthenticationMethodTypes, listUsers, passwordResetWithReturn } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

type SendResetCodeCommand = {
  loginName: string;
  requestId?: string;
};

export const submitUserNameForm = async (
  command: SendResetCodeCommand
): Promise<{ error: string } | { redirect: string }> => {
  const { t } = await serverTranslation("password");

  const genericErrorResponse = {
    error: t("errors.couldNotSendResetLink"),
  };

  const validationResult = await validateUsername({ username: command.loginName });
  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for password reset username");
    return genericErrorResponse;
  }

  const users = await listUsers({
    loginName: command.loginName,
  }).catch((_error) => {
    logMessage.warn("Failed to look up password reset user");
    return undefined;
  });

  if (!users) {
    return genericErrorResponse;
  }

  if (!users.details || users.details.totalResult !== BigInt(1) || !users.result[0].userId) {
    return genericErrorResponse;
  }

  const user = users.result[0];
  const userId = user.userId;

  let email: string | undefined;
  let emailVerified = false;

  if (user.type.case === "human") {
    email = user.type.value.email?.email;
    emailVerified = user.type.value.email?.isVerified ?? false;
  }

  if (!email) {
    logMessage.info("Password reset requested for user without email address");
    return genericErrorResponse;
  }

  if (!emailVerified) {
    logMessage.info("Password reset requested for user with unverified email address");
    return genericErrorResponse;
  }

  const response = await listAuthenticationMethodTypes(userId);

  const authMethods = response.authMethodTypes ?? [];
  const canUseTotp = authMethods.includes(AuthenticationMethodType.TOTP);
  const canUseU2F = authMethods.includes(AuthenticationMethodType.U2F);

  if (!canUseTotp && !canUseU2F) {
    logMessage.info("Password reset recovery requires at least one strong MFA method");
    return genericErrorResponse;
  }

  const codeResponse = await passwordResetWithReturn({
    userId,
  }).catch((_error) => {
    logMessage.error("Failed to get password reset code");
    return undefined;
  });

  if (!codeResponse || !("verificationCode" in codeResponse) || !codeResponse.verificationCode) {
    logMessage.error("Password reset code missing from response");
    return genericErrorResponse;
  }

  const apiKey = process.env.NOTIFY_API_KEY;
  const templateId = process.env.TEMPLATE_ID;
  const resetCode = codeResponse.verificationCode;

  if (!apiKey || !templateId) {
    logMessage.error("Missing NOTIFY_API_KEY or TEMPLATE_ID environment variables");
    return genericErrorResponse;
  }

  try {
    const gcNotify = GCNotifyConnector.default(apiKey);
    await gcNotify.sendEmail(email, templateId, getPasswordResetTemplate(resetCode));
  } catch (_error) {
    logMessage.error("Failed to send password reset email via GC Notify");
    return genericErrorResponse;
  }

  const session = await createSessionAndUpdateCookie({
    checks: create(ChecksSchema, {
      user: {
        search: {
          case: "userId",
          value: userId,
        },
      },
    }),
    requestId: command.requestId,
  }).catch((_error) => undefined);

  if (!session?.factors?.user?.id) {
    logMessage.error("Failed to create password reset recovery session");
    return genericErrorResponse;
  }

  redirect(buildUrlWithRequestId("/password/reset/verify", command.requestId));
};

export const resetPassword = AuthenticatedAction(async function resetPassword(
  session,
  { code, password, requestId }: { code?: string; password?: string; requestId?: string }
) {
  if (!code || !password) {
    throw new Error("Missing required properties to reset password");
  }

  const passwordValidation = await validatePassword({ password } as {
    [k: string]: FormDataEntryValue;
  });
  const codeValidation = await validateCode({ code } as {
    [k: string]: FormDataEntryValue;
  });
  if (!passwordValidation.success || !codeValidation.success) {
    logMessage.warn("Server side validation failed for password reset");
    throw new Error("Invalid password or code");
  }

  const changeResponse = await passwordResetWithCode({
    code,
    userId: session.factors.user.id,
    password,
  });
  if ("error" in changeResponse) {
    throw new Error(changeResponse.error);
  }

  await verifyPassword({
    loginName: session.factors.user.loginName ?? "",
    checks: create(ChecksSchema, {
      password: { password },
    }),
    requestId,
  });
});
