import { useRouter } from "next/navigation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changePassword, verifyPassword } from "@lib/server/password";
import { useTranslation } from "@i18n";

import { createRouterStub, createTranslationStub } from "../../../../../test/helpers/client";

import { ChangePasswordForm } from "./ChangePasswordForm";

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
  checkSessionAndSetPassword: vi.fn(),
  sendPassword: vi.fn(),
}));

vi.mock("@zitadel/client", () => ({
  create: vi.fn((_schema, payload) => payload),
}));

vi.mock("@components/auth/password-validation/PasswordValidationForm", () => ({
  PasswordValidationForm: ({
    successCallback,
  }: {
    successCallback: ({ password }: { password: string }) => Promise<void>;
  }) => (
    <button onClick={() => successCallback({ password: "N3wPassw0rd!" })} type="button">
      submit-change-password
    </button>
  ),
}));

describe("ChangePasswordForm", () => {
  const router = createRouterStub();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue(router);
    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);

    vi.mocked(changePassword).mockResolvedValue({ success: true } as never);
    vi.mocked(verifyPassword).mockResolvedValue({
      redirect: "/account?requestId=req-123",
    } as never);
  });

  it("submits changed password and redirects when verification succeeds", async () => {
    const user = userEvent.setup();

    render(
      <ChangePasswordForm
        sessionId="session-123"
        loginName="person@canada.ca"
        requestId="req-123"
        passwordComplexitySettings={{} as never}
      />
    );

    await user.click(screen.getByRole("button", { name: "submit-change-password" }));

    expect(changePassword).toHaveBeenCalledWith({
      sessionId: "session-123",
      password: "N3wPassw0rd!",
    });

    await waitFor(
      () => {
        expect(verifyPassword).toHaveBeenCalledWith({
          loginName: "person@canada.ca",
          requestId: "req-123",
          checks: {
            password: {
              password: "N3wPassw0rd!",
            },
          },
        });
        expect(router.push).toHaveBeenCalledWith("/account?requestId=req-123");
      },
      { timeout: 2500 }
    );
  });

  it("shows verification error when sendPassword rejects", async () => {
    const user = userEvent.setup();

    vi.mocked(verifyPassword).mockRejectedValue(new Error("network"));

    render(
      <ChangePasswordForm
        sessionId="session-123"
        loginName="person@canada.ca"
        requestId="req-123"
        passwordComplexitySettings={{} as never}
      />
    );

    await user.click(screen.getByRole("button", { name: "submit-change-password" }));

    await waitFor(
      () => {
        expect(screen.getByText("change.errors.couldNotVerifyPassword")).toBeInTheDocument();
      },
      { timeout: 2500 }
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});
