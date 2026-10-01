import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lib/logger", () => ({
  logMessage: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logMessage } from "@lib/logger";

import { createFreshdeskTicket } from "./freshdesk";

const validParams = {
  fullName: "Test User",
  email: "test@canada.ca",
  message: "Hello there",
  language: "en",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FRESHDESK_API_URL = "https://cds-snc.freshdesk.com";
  process.env.FRESHDESK_API_KEY = "test-api-key";
  process.env.FRESHDESK_PRODUCT_ID = "61000004602";
  process.env.FRESHDESK_GROUP_ID = "61000176987";
  process.env.FRESHDESK_TAGS = "GCPlatform_Usability_SSO";
});

afterEach(() => {
  delete process.env.FRESHDESK_API_URL;
  delete process.env.FRESHDESK_API_KEY;
  delete process.env.FRESHDESK_PRODUCT_ID;
  delete process.env.FRESHDESK_GROUP_ID;
  delete process.env.FRESHDESK_TAGS;
  vi.restoreAllMocks();
});

describe("createFreshdeskTicket", () => {
  it("returns an error when FRESHDESK_API_URL is not set", async () => {
    delete process.env.FRESHDESK_API_URL;

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Service unavailable" });
    expect(logMessage.error).toHaveBeenCalledWith("Freshdesk env vars not configured");
  });

  it("returns an error when FRESHDESK_API_KEY is not set", async () => {
    delete process.env.FRESHDESK_API_KEY;

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Service unavailable" });
    expect(logMessage.error).toHaveBeenCalledWith("Freshdesk env vars not configured");
  });

  it("returns an error when FRESHDESK_PRODUCT_ID is not set", async () => {
    delete process.env.FRESHDESK_PRODUCT_ID;

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Service unavailable" });
    expect(logMessage.error).toHaveBeenCalledWith("Freshdesk env vars not configured");
  });

  it("returns an error when FRESHDESK_GROUP_ID is not set", async () => {
    delete process.env.FRESHDESK_GROUP_ID;

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Service unavailable" });
    expect(logMessage.error).toHaveBeenCalledWith("Freshdesk env vars not configured");
  });

  it("returns an error when FRESHDESK_TAGS is not set", async () => {
    delete process.env.FRESHDESK_TAGS;

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Service unavailable" });
    expect(logMessage.error).toHaveBeenCalledWith("Freshdesk env vars not configured");
  });

  it("returns success and ticketId when the API responds with 201", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 12345 }), { status: 201 })
    );

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ success: true, ticketId: 12345 });
    expect(logMessage.info).toHaveBeenCalledWith("Freshdesk ticket created: 12345");
  });

  it("sends the correct request body and Authorization header", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await createFreshdeskTicket(validParams);

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://cds-snc.freshdesk.com/api/v2/tickets");
    expect(options.method).toBe("POST");

    const expectedCredentials = Buffer.from("test-api-key:X").toString("base64");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      `Basic ${expectedCredentials}`
    );

    const body = JSON.parse(options.body as string);
    expect(body.name).toBe("Test User");
    expect(body.email).toBe("test@canada.ca");
    expect(body.description).toBe("Hello there");
    expect(body.subject).toBe("GC Platform - Contact us");
    expect(body.type).toBe("Question");
    expect(body.product_id).toBe(61000004602);
    expect(body.group_id).toBe(61000176987);
    expect(body.tags).toEqual(["GCPlatform_Usability_SSO"]);
    expect(body.custom_fields).toEqual({ cf_language: "English" });
  });

  it("sets the French subject and language custom field when language is fr", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await createFreshdeskTicket({ ...validParams, language: "fr" });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.subject).toBe("Plateforme GC - Nous contacter");
    expect(body.custom_fields).toEqual({ cf_language: "Français" });
  });

  it("splits and trims multiple comma-separated tags from FRESHDESK_TAGS", async () => {
    process.env.FRESHDESK_TAGS = "GCPlatform_Usability_SSO, Another_Tag";
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await createFreshdeskTicket(validParams);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.tags).toEqual(["GCPlatform_Usability_SSO", "Another_Tag"]);
  });

  it("sanitizes personally identifiable information from the message before sending", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await createFreshdeskTicket({
      ...validParams,
      message: "Call me at (555) 123-4567",
    });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.description).not.toContain("(555) 123-4567");
    expect(body.description).toContain("[Redacted: phone_number]");
  });

  it("returns an error when the API responds with a non-OK status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 500 }));

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Failed to create ticket" });
    expect(logMessage.error).toHaveBeenCalledWith("Freshdesk API error: 500");
  });

  it("returns an error when fetch throws a network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const result = await createFreshdeskTicket(validParams);

    expect(result).toEqual({ error: "Failed to create ticket" });
    expect(logMessage.error).toHaveBeenCalledWith(
      "Freshdesk API request failed",
      expect.any(Error)
    );
  });
});
