import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTranslation } from "@i18n";

import { createTranslationStub } from "../../../../../test/helpers/client";
import { resetPassword } from "../actions";

import { PasswordReset } from "./PasswordReset";

vi.mock("@i18n", () => ({
  useTranslation: vi.fn(),
}));

vi.mock("@i18n/client", () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
  LANGUAGE_COOKIE_NAME: "i18next",
}));

vi.mock("../actions", () => ({
  resetPassword: vi.fn(() => Promise.resolve()),
}));

vi.mock("@zitadel/client", () => ({
  create: vi.fn((_schema, payload) => payload),
}));

vi.mock("@components/auth/password-validation/PasswordValidationForm", () => ({
  PasswordValidationForm: ({
    successCallback,
  }: {
    successCallback: ({ password, code }: { password: string; code?: string }) => Promise<void>;
  }) => (
    <button onClick={() => successCallback({ password: "P@ssw0rd", code: "123456" })} type="button">
      submit-password-reset
    </button>
  ),
}));

describe("PasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);
  });

  it("shows missing information error when password complexity settings are absent", () => {
    const { getByText } = render(<PasswordReset />);

    expect(getByText("reset.errors.missingRequiredInformation")).toBeInTheDocument();
  });

  it("submits password reset", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(<PasswordReset passwordComplexitySettings={{} as never} />);

    await user.click(getByRole("button", { name: "submit-password-reset" }));

    await vi.waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        password: "P@ssw0rd",
        code: "123456",
      });
    });
  });

  it("shows error message when changePassword returns an error", async () => {
    const user = userEvent.setup();

    vi.mocked(resetPassword).mockRejectedValue(new Error("reset.errors.couldNotSetPassword"));

    const { getByRole, getByText } = render(
      <PasswordReset passwordComplexitySettings={{} as never} />
    );

    await user.click(getByRole("button", { name: "submit-password-reset" }));

    await vi.waitFor(() => {
      expect(getByText("reset.errors.couldNotSetPassword")).toBeInTheDocument();
    });
  });
});
