"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { GCNotifyConnector } from "@gcforms/connectors";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getPasswordResetTemplate } from "@lib/emailTemplates";
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { buildUrlWithRequestId } from "@lib/utils";
import { listUsers, passwordResetWithReturn } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
type SendResetCodeCommand = {
  loginName: string;
  organization?: string;
  requestId?: string;
};

export const submitUserNameForm = async (
  command: SendResetCodeCommand
): Promise<{ error: string } | { redirect: string }> => {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const { t } = await serverTranslation("password");

  const users = await listUsers({
    serviceUrl,
    loginName: command.loginName,
    organizationId: command.organization,
  });

  const genericErrorResponse = {
    error: t("errors.couldNotSendResetLink"),
  };

  if (!users.details || users.details.totalResult !== BigInt(1) || !users.result[0].userId) {
    return genericErrorResponse;
  }

  const user = users.result[0];
  const userId = user.userId;

  let email: string | undefined;
  if (user.type.case === "human") {
    email = user.type.value.email?.email;
  }

  if (!email) {
    logMessage.info("Password reset requested for user without email address");
    return genericErrorResponse;
  }

  const codeResponse = await passwordResetWithReturn({
    serviceUrl,
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

  // Establish a recovery session tied to the identified user so a strong factor
  // can be challenged before the reset form is shown.
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

  return {
    redirect: buildUrlWithRequestId("/password/reset/verify", command.requestId),
  };
};
