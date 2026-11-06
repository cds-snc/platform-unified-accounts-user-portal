import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import en from "@root/i18n/locales/en.json";
import fr from "@root/i18n/locales/fr.json";

import { handleOTPFormSubmit } from "../actions";

import { LoginTOTP } from "./LoginTOTP";

vi.mock("@i18n", async () => {
  const { useTranslation } = await import("react-i18next");
  return {
    useTranslation,
    I18n: ({ i18nKey, namespace }: { i18nKey: string; namespace: string }) => {
      const { t } = useTranslation(namespace);
      return t(i18nKey);
    },
  };
});

vi.mock("@i18n/client", async () => {
  const { useTranslation } = await import("react-i18next");
  return { useTranslation };
});

vi.mock("@components/account/user-avatar", () => ({ UserAvatar: () => null }));
vi.mock("@components/ui/button/BackButton", () => ({ BackButton: () => null }));
vi.mock("@components/contexts/SiteConfigContext", () => ({
  useSiteConfig: () => ({ getSiteLink: () => false }),
}));
vi.mock("../actions", () => ({ handleOTPFormSubmit: vi.fn() }));

describe("LoginTOTP", () => {
  it.each([
    ["fr", "en"],
    ["en", "fr"],
  ])(
    "updates both validation messages when switching from %s to %s without resubmitting",
    async (initialLanguage, nextLanguage) => {
      vi.mocked(handleOTPFormSubmit).mockReset();
      vi.mocked(handleOTPFormSubmit).mockResolvedValue({
        validationErrors: [{ fieldKey: "code", errorKey: "verify.validation.invalidCodeLength" }],
        formData: { code: "12" },
      });

      const i18n = createInstance();
      await i18n.init({
        lng: initialLanguage,
        fallbackLng: "en",
        resources: { en, fr },
        interpolation: { escapeValue: false },
      });
      const user = userEvent.setup();
      render(
        <I18nextProvider i18n={i18n}>
          <LoginTOTP requestId="request-123" />
        </I18nextProvider>
      );

      await user.type(screen.getByRole("textbox"), "12");
      await user.click(screen.getByTestId("totp-submit"));

      const messages = {
        en: en.otp.verify.validation.invalidCodeLength,
        fr: fr.otp.verify.validation.invalidCodeLength,
      };
      const initialMessage = messages[initialLanguage as keyof typeof messages];
      const nextMessage = messages[nextLanguage as keyof typeof messages];

      expect(await screen.findAllByText(initialMessage)).toHaveLength(2);

      await act(async () => {
        await i18n.changeLanguage(nextLanguage);
      });

      expect(screen.getAllByText(nextMessage)).toHaveLength(2);
      expect(screen.queryByText(initialMessage)).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("12");
      expect(handleOTPFormSubmit).toHaveBeenCalledExactlyOnceWith({
        code: "12",
        requestId: "request-123",
      });
    }
  );
});
