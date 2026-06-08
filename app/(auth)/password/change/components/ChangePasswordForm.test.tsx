import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTranslation } from "@i18n";

import { createRouterStub, createTranslationStub } from "../../../../../test/helpers/client";
import { changePasswordFormAction } from "../action";

import { ChangePasswordForm } from "./ChangePasswordForm";

vi.mock("@i18n", () => ({
  useTranslation: vi.fn(),
}));

vi.mock("@i18n/client", () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
  LANGUAGE_COOKIE_NAME: "i18next",
}));

vi.mock("../action", () => ({
  changePasswordFormAction: vi.fn(() => Promise.resolve()),
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

    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);

    vi.mocked(changePasswordFormAction);
  });

  it("submits changed password and redirects when verification succeeds", async () => {
    const user = userEvent.setup();

    render(<ChangePasswordForm requestId="req-123" passwordComplexitySettings={{} as never} />);

    await user.click(screen.getByRole("button", { name: "submit-change-password" }));

    expect(changePasswordFormAction).toHaveBeenCalledWith("N3wPassw0rd!", "req-123");
  });

  it("shows verification error when sendPassword rejects", async () => {
    const user = userEvent.setup();

    vi.mocked(changePasswordFormAction).mockRejectedValue(
      new Error("change.errors.couldNotVerifyPassword")
    );

    render(<ChangePasswordForm requestId="req-123" passwordComplexitySettings={{} as never} />);

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
