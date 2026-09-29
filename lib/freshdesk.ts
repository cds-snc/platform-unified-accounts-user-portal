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

const FRESHDESK_PRODUCT_ID = 61000004602;
const FRESHDESK_GROUP_ID = 61000176987;
const FRESHDESK_TAGS = ["GCPlatform_Usability_SSO"];

const SUBJECT_BY_LANGUAGE: Record<"en" | "fr", string> = {
  en: "GC Platform - Contact us",
  fr: "Plateforme GC - Nous contacter",
};

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
  const isFrench = params.language === "fr";

  const body = {
    name: params.fullName,
    email: params.email,
    type: "Question",
    source: 2, // Portal
    priority: 1, // Low
    status: 2, // Open
    product_id: FRESHDESK_PRODUCT_ID,
    tags: FRESHDESK_TAGS,
    group_id: FRESHDESK_GROUP_ID,
    subject: isFrench ? SUBJECT_BY_LANGUAGE.fr : SUBJECT_BY_LANGUAGE.en,
    description: params.message,
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
