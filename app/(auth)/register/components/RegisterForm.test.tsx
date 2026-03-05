import { useRouter } from "next/navigation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "@root/app/(auth)/register/components/RegisterForm";
import { validateAccount } from "@lib/validationSchemas";
import { useTranslation } from "@i18n";

import { createRouterStub, createTranslationStub } from "../../../../test/helpers/client";
import { useRegistration } from "../context/RegistrationContext";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

vi.mock("@i18n", () => ({
  useTranslation: vi.fn(),
  I18n: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
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

vi.mock("../context/RegistrationContext", () => ({
  useRegistration: vi.fn(),
}));

describe("RegisterForm", () => {
  const router = createRouterStub();
  const setRegistrationData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue(router);
    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);
    vi.mocked(useRegistration).mockReturnValue({
      setRegistrationData,
      registrationData: null,
      clearRegistrationData: vi.fn(),
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
  });

  it("renders registration fields and submit button", () => {
    render(
      <RegisterForm
        organization="org-1"
        requestId="req-123"
        siteConfig={{
          id: "forms_dev",
          productId: "gcforms",
          baseUrl: "http://localhost:3000",
          zitadelOrganizationId: "org-1",
        }}
      />
    );

    expect(screen.getByLabelText(/labels\.firstname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/labels\.lastname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/labels\.email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "button.continue" })).toBeInTheDocument();

    const termsLink = screen.getByRole("link", { name: "terms.linkText" });
    expect(termsLink).toHaveAttribute("href", "http://localhost:3000/en/terms-of-use");
  });

  it("shows validation errors and stays on page when form is invalid", async () => {
    vi.mocked(validateAccount).mockResolvedValue({
      success: false,
      issues: [
        { path: [{ key: "firstname" }], message: "requiredFirstname" },
        { path: [{ key: "email" }], message: "requiredEmail" },
      ],
    } as never);

    render(
      <RegisterForm
        organization="org-1"
        requestId="req-123"
        siteConfig={{
          id: "forms_dev",
          productId: "gcforms",
          baseUrl: "http://localhost:3000",
          zitadelOrganizationId: "org-1",
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "button.continue" }));

    await waitFor(() => {
      expect(screen.getByText("validation.requiredFirstname")).toBeInTheDocument();
      expect(screen.getByText("validation.requiredEmail")).toBeInTheDocument();
    });

    expect(setRegistrationData).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("stores registration data and redirects to password step on valid submit", async () => {
    render(
      <RegisterForm
        organization="org-1"
        requestId="req-123"
        siteConfig={{
          id: "forms_dev",
          productId: "gcforms",
          baseUrl: "http://localhost:3000",
          zitadelOrganizationId: "org-1",
        }}
      />
    );

    await userEvent.type(screen.getByLabelText(/labels\.firstname/i), "Person");
    await userEvent.type(screen.getByLabelText(/labels\.lastname/i), "Example");
    await userEvent.type(screen.getByLabelText(/labels\.email/i), "person@canada.ca");
    await userEvent.click(screen.getByRole("button", { name: "button.continue" }));

    await waitFor(() => {
      expect(setRegistrationData).toHaveBeenCalledWith({
        firstname: "Person",
        lastname: "Example",
        email: "person@canada.ca",
        organization: "org-1",
        requestId: "req-123",
      });
      expect(router.push).toHaveBeenCalledWith("/register/password?requestId=req-123");
    });
  });
});
