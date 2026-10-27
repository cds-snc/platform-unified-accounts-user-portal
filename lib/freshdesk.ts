import { sanitizePii } from "@cdssnc/sanitize-pii";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";

import "server-only";

type CreateTicketParams = {
  fullName: string;
  email: string;
  message: string;
  language: string;
};

type FreshdeskTicketResponse = {
  id: number;
};

const FRESHDESK_FETCH_TIMEOUT_MS = 5000;

const SUBJECT_BY_LANGUAGE: Record<"en" | "fr", string> = {
  en: "GC Platform - Contact us",
  fr: "Plateforme GC - Nous contacter",
};

const formatDescription = (message: string) =>
  sanitizePii(message)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replace(/\r\n|\r|\n/g, "<br>");

export async function createFreshdeskTicket(
  params: CreateTicketParams
): Promise<{ success: true; ticketId: number } | { error: string }> {
  const apiUrl = process.env.FRESHDESK_API_URL;
  const apiKey = process.env.FRESHDESK_API_KEY;
  const productId = process.env.FRESHDESK_PRODUCT_ID;
  const groupId = process.env.FRESHDESK_GROUP_ID;
  const tags = process.env.FRESHDESK_TAGS;

  if (!apiUrl || !apiKey || !productId || !groupId || !tags) {
    logMessage.error("Freshdesk env vars not configured");
    return { error: "Service unavailable" };
  }

  const credentials = Buffer.from(`${apiKey}:X`).toString("base64");
  const isFrench = params.language === "fr";

  const body = {
    name: params.fullName,
    email: params.email,
    type: "Question",
    source: 2, // Portal
    priority: 1, // Low
    status: 2, // Open
    product_id: Number(productId),
    tags: tags.split(",").map((tag) => tag.trim()),
    group_id: Number(groupId),
    subject: isFrench ? SUBJECT_BY_LANGUAGE.fr : SUBJECT_BY_LANGUAGE.en,
    description: formatDescription(params.message),
    custom_fields: {
      cf_language: isFrench ? "Français" : "English",
    },
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
