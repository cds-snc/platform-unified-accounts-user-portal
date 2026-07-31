"use server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { serverTranslation } from "@i18n/server";

type ContactFormCommand = {
  fullName: string;
  email: string;
  message: string;
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

  // TODO: Implement actual message delivery
  // For now, we just log the message to the server logs
  logMessage.info("Contact form submitted");
  return { success: true };
}
