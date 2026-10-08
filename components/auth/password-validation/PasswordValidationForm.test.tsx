import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordValidationForm } from "./PasswordValidationForm";

const testState = vi.hoisted(() => ({
  validationErrors: undefined as { fieldKey: string; fieldValue: string }[] | undefined,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useActionState: () => [{ validationErrors: testState.validationErrors }, vi.fn(), false],
}));

vi.mock("@i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  I18n: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("./PasswordComplexity", () => ({
  PasswordComplexity: () => null,
}));

describe("PasswordValidationForm", () => {
  beforeEach(() => {
    testState.validationErrors = undefined;
  });

  it("does not reference a code error when the code is valid", () => {
    render(
      <PasswordValidationForm passwordComplexitySettings={{} as never} requireConfirmationCode />
    );

    const input = screen.getByRole("textbox", { name: /reset.labels.confirmationCode/ });
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("associates a code error with the confirmation-code input", () => {
    testState.validationErrors = [{ fieldKey: "code", fieldValue: "Invalid code" }];
    render(
      <PasswordValidationForm passwordComplexitySettings={{} as never} requireConfirmationCode />
    );

    const input = screen.getByRole("textbox", { name: /reset.labels.confirmationCode/ });
    expect(input).toHaveAttribute("aria-describedby", "errorMessageCode");
    expect(input).toHaveAccessibleDescription("Invalid code");
  });
});
