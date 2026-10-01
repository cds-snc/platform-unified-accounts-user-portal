"use server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { headers } from "next/headers";
import { verifyHCaptchaToken } from "@gcforms/hcaptcha/server";
import { isIP } from "node:net";

import { createFreshdeskTicket } from "@lib/freshdesk";
import { logMessage } from "@lib/logger";
import { ContactUsIssueType, ISSUE_TYPE_I18N_KEYS } from "@lib/validation/contactUsIssueTypes";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { serverTranslation } from "@i18n/server";
import { getCurrentLanguage, normalizeLocaleToSupportedLanguage } from "@i18n/utils";

type ContactFormCommand = {
  fullName: string;
  email: string;
  issueType: string;
  message: string;
  captchaToken: string;
  language: string;
};

const HCAPTCHA_MAX_ALLOWED_SCORE = 0.79;

async function getClientIp(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const xForwardedForHeader = requestHeaders.get("x-forwarded-for");

  if (xForwardedForHeader === null) {
    return undefined;
  }

  /**
   * Only consider last IP as the source of truth as it has been added by AWS ECS Load balancer
   * See https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html#x-forwarded-for-append
   */
  const clientIp = xForwardedForHeader.split(",").at(-1)?.trim();

  return clientIp && isIP(clientIp) ? clientIp : undefined;
}

export async function submitContactFormAction(
  command: ContactFormCommand
): Promise<{ success: true } | { error: string }> {
  // Prefer the language reported by the client's i18next instance since it can
  // diverge from the "i18next" cookie (e.g. cookie cleared while localStorage persists).
  const language = command.language
    ? normalizeLocaleToSupportedLanguage(command.language)
    : await getCurrentLanguage();
  const { t } = await serverTranslation("contact-us", { lang: language });
  const genericErrorResponse = {
    error: t("errors.submitFailed"),
  };

  const validationResult = await validateContactForm(command);

  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for contact form");
    return genericErrorResponse;
  }

  const captchaResult = await verifyHCaptchaToken(command.captchaToken, {
    secret: process.env.HCAPTCHA_SECRET,
    siteKey: process.env.HCAPTCHA_SITE_KEY,
    remoteIp: process.env.HCAPTCHA_SITE_KEY ? await getClientIp() : undefined,
    maxAllowedScore: HCAPTCHA_MAX_ALLOWED_SCORE,
    logger: {
      info: (message) => logMessage.info(message),
      warn: (message) => logMessage.warn(message),
    },
  });

  if (!captchaResult.verified) {
    logMessage.warn("hCaptcha verification failed for contact form");
    return genericErrorResponse;
  }

  const issueTypeLabel = t(ISSUE_TYPE_I18N_KEYS[command.issueType as ContactUsIssueType]);
  const description = `${t("issueTypeLabel")}: ${issueTypeLabel}<br><br>${command.message}`;

  const result = await createFreshdeskTicket({
    fullName: command.fullName,
    email: command.email,
    message: description,
    language,
  });

  if ("error" in result) {
    logMessage.error("Failed to create Freshdesk ticket");
    return genericErrorResponse;
  }

  return { success: true };
}
