"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { GCNotifyConnector } from "@gcforms/connectors";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSecurityCodeTemplate } from "@lib/emailTemplates";
import { logMessage } from "@lib/logger";
import { buildUrlWithRequestId } from "@lib/utils";
import { validateCode } from "@lib/validation/validationSchemas";
import { getUserByID, sendEmailCodeWithReturn, verifyEmail } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

export const sendVerificationEmail = AuthenticatedAction(
  "password_required",
  async function sendVerificationEmail(session) {
    const { t } = await serverTranslation("verify");

    const userId = session.factors.user.id;

    // Get verification code from Zitadel (returnCode mode - does not send email)
    const codeResponse = await sendEmailCodeWithReturn({
      userId,
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
    const userResponse = await getUserByID(userId);

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
);

type VerifyUserByEmailCommand = {
  code: string;
  requestId?: string;
};

export const checkVerificationCode = AuthenticatedAction(
  "password_required",
  async function checkVerificationCode(credentials, command: VerifyUserByEmailCommand) {
    const { t } = await serverTranslation("verify");
    const userId = credentials.factors.user.id;

    const validationResult = await validateCode({ code: command.code } as {
      [k: string]: FormDataEntryValue;
    });
    if (!validationResult.success) {
      logMessage.warn("Server side validation failed for verification code");
      return { error: t("errors.couldNotVerifyEmail") };
    }

    const verifyResponse = await verifyEmail({
      userId: userId,
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

    return { redirect: buildUrlWithRequestId("/verify/success", command.requestId) };
  }
);
