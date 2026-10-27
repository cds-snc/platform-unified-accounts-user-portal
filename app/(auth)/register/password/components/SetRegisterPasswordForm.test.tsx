import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateAccount } from "@lib/validation/validationSchemas";
import { useTranslation } from "@i18n";

import { createTranslationStub } from "../../../../../test/helpers/client";
import { registerUser } from "../../actions";

import { SetRegisterPasswordForm } from "./SetRegisterPasswordForm";

vi.mock("@i18n/client", () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
  LANGUAGE_COOKIE_NAME: "i18next",
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateAccount: vi.fn(),
}));

vi.mock("../../actions", () => ({
  registerUser: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../context/RegistrationContext", () => ({
  useRegistration: vi.fn(),
}));

vi.mock("@components/auth/password-validation/PasswordValidationForm", () => ({
  PasswordValidationForm: ({
    successCallback,
  }: {
    successCallback: ({ password }: { password: string }) => Promise<void>;
  }) => (
    <button onClick={() => successCallback({ password: "P@ssw0rd" })} type="button">
      trigger-password-submit
    </button>
  ),
}));

describe("SetRegisterPasswordForm", () => {
  const baseProps = {
    passwordComplexitySettings: {} as never,
    email: "person@canada.ca",
    firstname: "Person",
    lastname: "Example",
    inviteCode: "invite-code",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);

    vi.mocked(validateAccount).mockResolvedValue({
      success: true,
      output: {
        firstname: "Person",
        lastname: "Example",
        email: "person@canada.ca",
      },
    } as never);
  });

  it("registers user on successful submission", async () => {
    render(<SetRegisterPasswordForm {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "trigger-password-submit" }));

    expect(registerUser).toHaveBeenCalledWith({
      email: "person@canada.ca",
      firstName: "Person",
      lastName: "Example",
      password: "P@ssw0rd",
      inviteCode: "invite-code",
    });
  });

  it("shows server returned error and does not redirect", async () => {
    vi.mocked(registerUser).mockResolvedValue({ error: "errors.couldNotCreateUser" } as never);

    render(<SetRegisterPasswordForm {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "trigger-password-submit" }));

    await waitFor(() => {
      expect(screen.getByText("errors.couldNotCreateUser")).toBeInTheDocument();
    });
  });

  it("continues registration call even when account validation fails", async () => {
    vi.mocked(validateAccount).mockResolvedValue({ success: false } as never);
    vi.mocked(registerUser).mockResolvedValue({ error: "errors.couldNotCreateUser" } as never);

    render(<SetRegisterPasswordForm {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "trigger-password-submit" }));

    await waitFor(() => {
      expect(screen.getByText("errors.couldNotCreateUser")).toBeInTheDocument();
    });
    expect(registerUser).toHaveBeenCalled();
  });
});
