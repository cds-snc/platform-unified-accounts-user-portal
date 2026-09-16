"use server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { headers } from "next/headers";
import { verifyHCaptchaToken } from "@gcforms/hcaptcha/server";
import { isIP } from "node:net";

import { logMessage } from "@lib/logger";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { serverTranslation } from "@i18n/server";

type ContactFormCommand = {
  fullName: string;
  email: string;
  message: string;
  captchaToken: string;
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
  const { t } = await serverTranslation("contact-us");
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

  // TODO: Implement actual message delivery
  // For now, we just log the message to the server logs
  logMessage.info("Contact form submitted");
  return { success: true };
}
