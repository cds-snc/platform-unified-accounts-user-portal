import { useRouter } from "next/navigation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateAccount } from "@lib/client/validationSchemas";
import { useTranslation } from "@i18n";

import { createRouterStub, createTranslationStub } from "../../../../../test/helpers/client";
import { registerUser } from "../../actions";
import { useRegistration } from "../../context/RegistrationContext";

import { SetRegisterPasswordForm } from "./SetRegisterPasswordForm";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@i18n", () => ({
  useTranslation: vi.fn(),
}));

vi.mock("@i18n/client", () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
  LANGUAGE_COOKIE_NAME: "i18next",
}));

vi.mock("@lib/validationSchemas", () => ({
  validateAccount: vi.fn(),
}));

vi.mock("../../actions", () => ({
  registerUser: vi.fn(),
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
  const router = createRouterStub();
  const clearRegistrationData = vi.fn();
  const onSubmitSuccess = vi.fn();

  const baseProps = {
    passwordComplexitySettings: {} as never,
    email: "person@canada.ca",
    firstname: "Person",
    lastname: "Example",
    requestId: "req-123",
    onSubmitSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue(router);
    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);
    vi.mocked(useRegistration).mockReturnValue({
      clearRegistrationData,
      setRegistrationData: vi.fn(),
      registrationData: null,
      isHydrated: true,
    } as never);

    vi.mocked(validateAccount).mockResolvedValue({
      success: true,
      output: {
        firstname: "Person",
        lastname: "Example",
        email: "person@canada.ca",
      },
    } as never);
    vi.mocked(registerUser).mockResolvedValue({ redirect: "/account?requestId=req-123" } as never);
  });

  it("registers user and redirects on successful submission", async () => {
    render(<SetRegisterPasswordForm {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "trigger-password-submit" }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        email: "person@canada.ca",
        firstName: "Person",
        lastName: "Example",
        password: "P@ssw0rd",
        requestId: "req-123",
      });
      expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
      expect(clearRegistrationData).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith("/account?requestId=req-123");
    });
  });

  it("shows server returned error and does not redirect", async () => {
    vi.mocked(registerUser).mockResolvedValue({ error: "errors.couldNotCreateUser" } as never);

    render(<SetRegisterPasswordForm {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "trigger-password-submit" }));

    await waitFor(() => {
      expect(screen.getByText("errors.couldNotCreateUser")).toBeInTheDocument();
    });

    expect(onSubmitSuccess).not.toHaveBeenCalled();
    expect(clearRegistrationData).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows generic registration error when registerUser rejects", async () => {
    vi.mocked(registerUser).mockRejectedValue(new Error("network error"));

    render(<SetRegisterPasswordForm {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "trigger-password-submit" }));

    await waitFor(() => {
      expect(screen.getByText("errors.couldNotRegisterUser")).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
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
