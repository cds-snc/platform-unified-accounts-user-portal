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
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FRESHDESK_API_URL = "https://cds-snc.freshdesk.com";
  process.env.FRESHDESK_API_KEY = "test-api-key";
});

afterEach(() => {
  delete process.env.FRESHDESK_API_URL;
  delete process.env.FRESHDESK_API_KEY;
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
    expect(body.subject).toBe("Contact Us Form Submission");
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
