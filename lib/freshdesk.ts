/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { ContactUsIssueType } from "@lib/validation/contactUsIssueTypes";

type CreateTicketParams = {
  fullName: string;
  email: string;
  issueType: ContactUsIssueType;
  message: string;
};

type FreshdeskTicketResponse = {
  id: number;
};

const ISSUE_TYPE_LABELS: Record<ContactUsIssueType, string> = {
  "password-reset": "Unable to reset password",
  "mfa-issue": "Second factor authentication is missing or not working",
  "sign-up-issue": "Unable to sign up",
  other: "Other",
};

const FRESHDESK_FETCH_TIMEOUT_MS = 5000;

export async function createFreshdeskTicket(
  params: CreateTicketParams
): Promise<{ success: true; ticketId: number } | { error: string }> {
  const apiUrl = process.env.FRESHDESK_API_URL;
  const apiKey = process.env.FRESHDESK_API_KEY;

  if (!apiUrl || !apiKey) {
    logMessage.error("Freshdesk env vars not configured");
    return { error: "Service unavailable" };
  }

  const credentials = Buffer.from(`${apiKey}:X`).toString("base64");

  const body = {
    name: params.fullName,
    email: params.email,
    subject: `Contact Us Form Submission: ${ISSUE_TYPE_LABELS[params.issueType]}`,
    description: params.message,
    source: 2, // Portal
    priority: 1, // Low
    status: 2, // Open
  };

  try {
    const response = await fetch(`${apiUrl}/api/v2/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FRESHDESK_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logMessage.error(`Freshdesk API error: ${response.status}`);
      return { error: "Failed to create ticket" };
    }

    const data = (await response.json()) as FreshdeskTicketResponse;
    logMessage.info(`Freshdesk ticket created: ${data.id}`);
    return { success: true, ticketId: data.id };
  } catch (e) {
    logMessage.error("Freshdesk API request failed", e);
    return { error: "Failed to create ticket" };
  }
}
