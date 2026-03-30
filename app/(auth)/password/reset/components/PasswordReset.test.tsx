import { useRouter } from "next/navigation";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changePassword, sendPassword } from "@lib/server/password";
import { useTranslation } from "@i18n";

import { createRouterStub, createTranslationStub } from "../../../../../test/helpers/client";

import { PasswordReset } from "./PasswordReset";

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

vi.mock("@lib/server/password", () => ({
  changePassword: vi.fn(),
  sendPassword: vi.fn(),
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
  const router = createRouterStub();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue(router);
    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);

    vi.mocked(changePassword).mockResolvedValue({ success: true } as never);
    vi.mocked(sendPassword).mockResolvedValue({ redirect: "/account?requestId=req-123" } as never);
  });

  it("shows missing information error when password complexity settings are absent", () => {
    const { getByText } = render(<PasswordReset userId="user-123" />);

    expect(getByText("reset.errors.missingRequiredInformation")).toBeInTheDocument();
  });

  it("submits password reset and redirects when password verification succeeds", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(
      <PasswordReset
        userId="user-123"
        loginName="person@canada.ca"
        organization="org-1"
        passwordComplexitySettings={{} as never}
      />
    );

    await user.click(getByRole("button", { name: "submit-password-reset" }));

    await vi.waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        userId: "user-123",
        password: "P@ssw0rd",
        code: "123456",
      });
      expect(sendPassword).toHaveBeenCalledWith({
        loginName: "person@canada.ca",
        organization: "org-1",
        checks: {
          password: {
            password: "P@ssw0rd",
          },
        },
      });
      expect(router.push).toHaveBeenCalledWith("/account?requestId=req-123");
    });
  });

  it("shows error message when changePassword returns an error", async () => {
    const user = userEvent.setup();

    vi.mocked(changePassword).mockResolvedValue({
      error: "reset.errors.couldNotSetPassword",
    } as never);

    const { getByRole, getByText } = render(
      <PasswordReset userId="user-123" passwordComplexitySettings={{} as never} />
    );

    await user.click(getByRole("button", { name: "submit-password-reset" }));

    await vi.waitFor(() => {
      expect(getByText("reset.errors.couldNotSetPassword")).toBeInTheDocument();
    });
    expect(sendPassword).not.toHaveBeenCalled();
  });

  it("shows verification error when sendPassword rejects", async () => {
    const user = userEvent.setup();

    vi.mocked(sendPassword).mockRejectedValue(new Error("network"));

    const { getByRole, getByText } = render(
      <PasswordReset
        userId="user-123"
        loginName="person@canada.ca"
        organization="org-1"
        passwordComplexitySettings={{} as never}
      />
    );

    await user.click(getByRole("button", { name: "submit-password-reset" }));

    await vi.waitFor(() => {
      expect(getByText("reset.errors.couldNotVerifyPassword")).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});
