import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFreshdeskTicket } from "@lib/freshdesk";

import { submitContactFormAction } from "./actions";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
  headers: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));

vi.mock("@gcforms/hcaptcha/server", () => ({
  verifyHCaptchaToken: vi.fn().mockResolvedValue({ verified: true }),
}));

vi.mock("@lib/freshdesk", () => ({
  createFreshdeskTicket: vi.fn().mockResolvedValue({ success: true, ticketId: 1 }),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn().mockResolvedValue({
    t: (key: string) => key,
  }),
}));

const validCommand = {
  fullName: "Test User",
  email: "test@canada.ca",
  issueType: "other",
  message: "Hello there",
  captchaToken: "captcha-token",
  language: "en",
};

describe("submitContactFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses normalized form values after validation", async () => {
    const result = await submitContactFormAction({
      ...validCommand,
      fullName: "  Test User  ",
      email: "  test@canada.ca  ",
      issueType: "  other  ",
      message: "  Hello there  ",
    });

    expect(result).toEqual({ success: true });
    expect(createFreshdeskTicket).toHaveBeenCalledWith({
      fullName: "Test User",
      email: "test@canada.ca",
      message: "issueTypeLabel: issueTypeOptions.other\n\nHello there",
      language: "en",
    });
  });
});
