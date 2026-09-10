"use server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { verifyHCaptchaToken } from "@gcforms/hcaptcha/server";

import { logMessage } from "@lib/logger";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { serverTranslation } from "@i18n/server";

type ContactFormCommand = {
  fullName: string;
  email: string;
  message: string;
  captchaToken: string;
};

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
    siteKey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
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
