import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";
import { ResourceOwnerType } from "@zitadel/proto/zitadel/settings/v2/settings_pb";
import { createInstance } from "i18next";
import { describe, expect, it, vi } from "vitest";

import { useTranslation } from "@i18n";
import en from "@i18n/locales/en.json";
import fr from "@i18n/locales/fr.json";

import { PasswordValidationForm } from "./PasswordValidationForm";

vi.mock("@i18n", () => ({
  useTranslation: vi.fn(() => ({ t: (key: string) => key })),
  I18n: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  LANGUAGE_COOKIE_NAME: "i18next",
}));

const settings: PasswordComplexitySettings = {
  $typeName: "zitadel.settings.v2.PasswordComplexitySettings",
  minLength: BigInt(8),
  requiresNumber: true,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresSymbol: true,
  resourceOwnerType: ResourceOwnerType.INSTANCE,
};

describe("PasswordValidationForm", () => {
  it.each([
    ["en", "", "Enter the confirmation code."],
    ["en", "12345678901", "Confirmation code must be 10 characters or fewer."],
    ["fr", "12345678901", "Le code de confirmation doit comporter 10 caractères au maximum."],
    ["en", "1234567890", ""],
  ])("validates confirmation code %s/%s", async (language, code, message) => {
    const translations = createInstance();
    await translations.init({ lng: language, resources: { en, fr }, fallbackNS: "common" });
    vi.mocked(useTranslation).mockReturnValue({
      t: translations.getFixedT(language, "password"),
    } as never);
    const successCallback = vi.fn();
    const { container } = render(
      <PasswordValidationForm
        passwordComplexitySettings={settings}
        requireConfirmationCode
        successCallback={successCallback}
      />
    );
    for (const [id, value] of Object.entries({
      code,
      password: "Abcdef1!",
      confirmPassword: "Abcdef1!",
    })) {
      fireEvent.change(container.querySelector(`#${id}`)!, { target: { value } });
    }
    fireEvent.submit(container.querySelector("form")!);

    if (message) {
      await waitFor(() =>
        expect(document.getElementById("errorMessageCode")).toHaveTextContent(message)
      );
      expect(await screen.findByRole("link", { name: message })).toBeVisible();
      expect(successCallback).not.toHaveBeenCalled();
    } else {
      await waitFor(() =>
        expect(successCallback).toHaveBeenCalledWith({ password: "Abcdef1!", code })
      );
    }
    vi.mocked(useTranslation).mockReturnValue({ t: (key: string) => key } as never);
  });

  it("identifies both password fields as new passwords", () => {
    render(<PasswordValidationForm passwordComplexitySettings={settings} />);

    expect(screen.getByLabelText(/create.labels.password/)).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    expect(screen.getByLabelText(/create.labels.confirmPassword/)).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
  });

  it("keeps the form pending and prevents duplicate activation until submission finishes", async () => {
    const user = userEvent.setup();
    let resolveSubmission: (() => void) | undefined;
    const pendingSubmission = new Promise<void>((resolve) => {
      resolveSubmission = resolve;
    });
    const successCallback = vi.fn(() => pendingSubmission);
    render(
      <PasswordValidationForm
        passwordComplexitySettings={settings}
        successCallback={successCallback}
      />
    );

    await user.type(screen.getByLabelText(/create.labels.password/), "Abcdef1!");
    await user.type(screen.getByLabelText(/create.labels.confirmPassword/), "Abcdef1!");
    const submitButton = screen.getByRole("button", { name: "button.continue" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(successCallback).toHaveBeenCalledWith({ password: "Abcdef1!" });
      expect(submitButton).toHaveAttribute("aria-disabled", "true");
    });
    await user.click(submitButton);
    expect(successCallback).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmission?.();
      await pendingSubmission;
    });
    await waitFor(() => expect(submitButton).toHaveAttribute("aria-disabled", "false"));
  });

  it("supports synchronous submission callbacks", async () => {
    const user = userEvent.setup();
    const successCallback = vi.fn();
    render(
      <PasswordValidationForm
        passwordComplexitySettings={settings}
        successCallback={successCallback}
      />
    );

    await user.type(screen.getByLabelText(/create.labels.password/), "Abcdef1!");
    await user.type(screen.getByLabelText(/create.labels.confirmPassword/), "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "button.continue" }));

    await waitFor(() => {
      expect(successCallback).toHaveBeenCalledWith({ password: "Abcdef1!" });
      expect(screen.getByRole("button", { name: "button.continue" })).toHaveAttribute(
        "aria-disabled",
        "false"
      );
    });
  });

  it("interpolates the current policy in summary and inline validation messages", async () => {
    const translations = createInstance();
    await translations.init({ lng: "en", resources: { en }, fallbackNS: "common" });
    vi.mocked(useTranslation).mockReturnValue({
      t: translations.getFixedT(null, "password"),
    } as never);
    const user = userEvent.setup();
    render(<PasswordValidationForm passwordComplexitySettings={settings} />);

    await user.type(screen.getByLabelText(/^Password/), "Ab1!");
    await user.type(screen.getByLabelText(/^Confirm password/), "Ab1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("link", { name: "At least 8 characters" })).toBeVisible();
    expect(document.getElementById("errorMessagePassword")).toHaveTextContent(
      "At least 8 characters"
    );
  });
});
