"use server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { createFreshdeskTicket } from "@lib/freshdesk";
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

  const result = await createFreshdeskTicket({
    fullName: command.fullName,
    email: command.email,
    message: command.message,
  });

  if ("error" in result) {
    logMessage.error("Failed to create Freshdesk ticket");
    return genericErrorResponse;
  }

  return { success: true };
}
