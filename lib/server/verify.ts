/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { GCNotifyConnector } from "@gcforms/connectors";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getAccountRestrictedTemplate, getPasswordChangedTemplate } from "@lib/emailTemplates";
import { SiteConfigService } from "@lib/site-config";
import { getUserByID, listUsers } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { logMessage } from "../../lib/logger";

import "server-only";

type SendPasswordChangedEmailCommand = {
  userId: string;
};

/**
 * Emails the account owner that a sign-in was attempted on a locked or disabled account.
 * Never throws and never returns details, so the login response cannot reveal account state.
 */
export async function sendAccountRestrictedEmail({ loginName }: { loginName: string }) {
  try {
    const apiKey = process.env.NOTIFY_API_KEY;
    const templateId = process.env.TEMPLATE_ID;

    if (!apiKey || !templateId) {
      logMessage.error("Missing NOTIFY_API_KEY or TEMPLATE_ID environment variables");
      return;
    }

    const users = await listUsers({ loginName });

    if (users.details?.totalResult !== BigInt(1)) {
      return;
    }

    const user = users.result[0];
    const email = user.type.case === "human" ? user.type.value.email?.email : undefined;
    const emailVerified = user.type.case === "human" && user.type.value.email?.isVerified;

    if (!email || !emailVerified) {
      return;
    }

    const contactUsUrl = (await SiteConfigService.getInstance()).getSiteLink("contact-us");
    await GCNotifyConnector.default(apiKey).sendEmail(
      email,
      templateId,
      getAccountRestrictedTemplate(contactUsUrl)
    );
  } catch {
    logMessage.error("Failed to send account restricted email");
  }
}

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
    const contactUsUrl = (await SiteConfigService.getInstance()).getSiteLink("contact-us");

    await gcNotify.sendEmail(email, templateId, getPasswordChangedTemplate(contactUsUrl));

    return { success: true };
  } catch (error) {
    logMessage.debug({ error, message: "Failed to send password changed email" });
    return { error: t("errors.emailSendFailed") };
  }
}
