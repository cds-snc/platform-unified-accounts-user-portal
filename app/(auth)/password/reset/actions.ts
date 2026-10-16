"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { cookies } from "next/headers";
import { after } from "next/server";
import { GCNotifyConnector } from "@gcforms/connectors";
import { create, Duration } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import {
  getPasswordResetContactSupportTemplate,
  getPasswordResetTemplate,
} from "@lib/emailTemplates";
import { logMessage } from "@lib/logger";
import { passwordResetWithCode, verifyPassword } from "@lib/server/password";
import {
  createResetKey,
  PASSWORD_RESET_COOKIE,
  PASSWORD_RESET_TTL_SECONDS,
  sealResetSession,
} from "@lib/server/password-reset";
import { SiteConfigService } from "@lib/site-config";
import {
  validateCode,
  validatePassword,
  validateUsername,
} from "@lib/validation/validationSchemas";
import {
  createSessionFromChecks,
  listAuthenticationMethodTypes,
  listUsers,
  passwordResetWithReturn,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

type SendResetCodeCommand = {
  loginName: string;
  requestId?: string;
};

export const submitUserNameForm = async (
  command: SendResetCodeCommand
): Promise<{ error: string } | { success: true }> => {
  const validationResult = await validateUsername({ username: command.loginName });
  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for password reset username");
    const { t } = await serverTranslation("password");
    return { error: t("errors.couldNotSendResetLink") };
  }

  const key = createResetKey();
  (await cookies()).set({
    name: PASSWORD_RESET_COOKIE,
    value: key,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PASSWORD_RESET_TTL_SECONDS,
  });

  // Send the password reset email after the response is sent to the client
  // so that timing attacks cannot be used to infer valid usernames
  after(() => sendPasswordResetEmail(command, key));

  return { success: true };
};

async function sendPasswordResetEmail({ loginName, requestId }: SendResetCodeCommand, key: string) {
  const apiKey = process.env.NOTIFY_API_KEY;
  const templateId = process.env.TEMPLATE_ID;

  if (!apiKey || !templateId) {
    logMessage.error("Missing NOTIFY_API_KEY or TEMPLATE_ID environment variables");
    return;
  }

  try {
    const users = await listUsers({ loginName });
    const user = users.details?.totalResult === BigInt(1) ? users.result[0] : undefined;
    const email = user?.type.case === "human" ? user.type.value.email : undefined;

    if (!user?.userId || !email?.email || !email.isVerified) {
      logMessage.info("Password reset requested for unknown or unverified account");
      return;
    }

    const gcNotify = GCNotifyConnector.default(apiKey);
    const siteConfig = await SiteConfigService.getInstance();
    const { authMethodTypes = [] } = await listAuthenticationMethodTypes(user.userId);
    const hasStrongMFA =
      authMethodTypes.includes(AuthenticationMethodType.TOTP) ||
      authMethodTypes.includes(AuthenticationMethodType.U2F);

    if (!hasStrongMFA) {
      await gcNotify.sendEmail(
        email.email,
        templateId,
        getPasswordResetContactSupportTemplate(siteConfig.getSiteLink("contact-us"))
      );
      return;
    }

    const { verificationCode } = await passwordResetWithReturn({ userId: user.userId });
    if (!verificationCode) {
      throw new Error("Password reset code missing from response");
    }

    const resetSession = await createSessionFromChecks({
      checks: create(ChecksSchema, {
        user: { search: { case: "userId", value: user.userId } },
      }),
      lifetime: { seconds: BigInt(PASSWORD_RESET_TTL_SECONDS), nanos: 0 } as Duration,
    });

    const params = new URLSearchParams({ token: sealResetSession(resetSession, key) });
    if (requestId) {
      params.set("requestId", requestId);
    }

    await gcNotify.sendEmail(
      email.email,
      templateId,
      getPasswordResetTemplate(
        verificationCode,
        siteConfig.getSiteLink(`password/reset/continue?${params}`)
      )
    );
  } catch {
    logMessage.error("Failed to send password reset email");
  }
}

export const resetPassword = AuthenticatedAction(
  { authLevel: "mfa_no_password" },
  async function resetPassword(
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

    (await cookies()).delete(PASSWORD_RESET_COOKIE);

    await verifyPassword({
      loginName: session.factors.user.loginName ?? "",
      checks: create(ChecksSchema, {
        password: { password },
      }),
      requestId,
    });
  }
);
