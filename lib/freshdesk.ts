/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";

type CreateTicketParams = {
  fullName: string;
  email: string;
  message: string;
};

type FreshdeskTicketResponse = {
  id: number;
};

/**
 * Creates a support ticket in Freshdesk via the REST API.
 *
 * Authentication: Basic Auth with FRESHDESK_API_KEY as username, "X" as password.
 * Endpoint: POST https://{domain}.freshdesk.com/api/v2/tickets
 *
 * Required env vars:
 *   FRESHDESK_API_URL  - e.g. https://cds-snc.freshdesk.com
 *   FRESHDESK_API_KEY  - Freshdesk agent API key
 */
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
    subject: "Contact Us Form Submission",
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
