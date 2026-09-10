import { verifyHCaptchaToken } from "@gcforms/hcaptcha/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateContactForm } from "@lib/validation/validationSchemas";

import { submitContactFormAction } from "./actions";

vi.mock("@gcforms/hcaptcha/server", () => ({
  verifyHCaptchaToken: vi.fn(),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateContactForm: vi.fn(),
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn().mockResolvedValue({
    t: (key: string) => `translated:${key}`,
  }),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("submitContactFormAction", () => {
  const command = {
    fullName: "Test User",
    email: "test@canada.ca",
    message: "Hello there",
    captchaToken: "captcha-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("HCAPTCHA_SECRET", "captcha-secret");
    vi.stubEnv("NEXT_PUBLIC_HCAPTCHA_SITE_KEY", "site-key");
    vi.mocked(validateContactForm).mockResolvedValue({ success: true } as never);
    vi.mocked(verifyHCaptchaToken).mockResolvedValue({ verified: true });
  });

  it("returns a generic error before CAPTCHA verification when validation fails", async () => {
    vi.mocked(validateContactForm).mockResolvedValue({ success: false } as never);

    await expect(submitContactFormAction(command)).resolves.toEqual({
      error: "translated:errors.submitFailed",
    });
    expect(verifyHCaptchaToken).not.toHaveBeenCalled();
  });

  it("returns a generic error when CAPTCHA verification fails", async () => {
    vi.mocked(verifyHCaptchaToken).mockResolvedValue({
      verified: false,
      reason: "invalid-response",
    });

    await expect(submitContactFormAction(command)).resolves.toEqual({
      error: "translated:errors.submitFailed",
    });
    expect(verifyHCaptchaToken).toHaveBeenCalledWith("captcha-token", {
      secret: "captcha-secret",
      siteKey: "site-key",
      logger: expect.any(Object),
    });
  });

  it("returns success only after CAPTCHA verification succeeds", async () => {
    await expect(submitContactFormAction(command)).resolves.toEqual({ success: true });
    expect(verifyHCaptchaToken).toHaveBeenCalledTimes(1);
  });
});
