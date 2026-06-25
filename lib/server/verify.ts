"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { GCNotifyConnector } from "@gcforms/connectors";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getPasswordChangedTemplate } from "@lib/emailTemplates";
import { getUserByID } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { logMessage } from "../../lib/logger";

type SendPasswordChangedEmailCommand = {
  userId: string;
};

export async function sendPasswordChangedEmail(command: SendPasswordChangedEmailCommand) {
  const { t } = await serverTranslation("password");

  // Get user's email address
  const userResponse = await getUserByID(command.userId);

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
