import { useRouter } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRouterStub } from "../../../../test/helpers/client";
import { useRegistration } from "../context/RegistrationContext";

import { PasswordPageClient } from "./PasswordPageClient";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("../context/RegistrationContext", () => ({
  useRegistration: vi.fn(),
}));

vi.mock("./components/SetRegisterPasswordForm", () => ({
  SetRegisterPasswordForm: ({
    email,
    firstname,
    lastname,

    requestId,
    onSubmitSuccess,
  }: {
    email: string;
    firstname: string;
    lastname: string;

    requestId?: string;
    onSubmitSuccess?: () => void;
  }) => (
    <div>
      <span>{`set-register-password:${email}:${firstname}:${lastname}:${requestId ?? ""}`}</span>
      <button onClick={() => onSubmitSuccess?.()} type="button">
        complete-register-password
      </button>
    </div>
  ),
}));

describe("PasswordPageClient", () => {
  const router = createRouterStub();

  let registrationData: {
    firstname: string;
    lastname: string;
    email: string;
    requestId?: string;
  } | null;
  let isHydrated = true;

  beforeEach(() => {
    vi.clearAllMocks();
    registrationData = null;
    isHydrated = true;

    vi.mocked(useRouter).mockReturnValue(router);
    vi.mocked(useRegistration).mockImplementation(
      () =>
        ({
          registrationData,
          isHydrated,
          setRegistrationData: vi.fn(),
          clearRegistrationData: vi.fn(),
        }) as never
    );
  });

  it("renders nothing while registration context is hydrating", () => {
    isHydrated = false;

    const { container } = render(<PasswordPageClient passwordComplexitySettings={{} as never} />);

    expect(container).toBeEmptyDOMElement();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects to register when hydrated but registration data is missing", () => {
    registrationData = null;

    const { container } = render(<PasswordPageClient passwordComplexitySettings={{} as never} />);

    expect(container).toBeEmptyDOMElement();
    expect(router.replace).toHaveBeenCalledWith("/register");
  });

  it("renders password form with registration data", () => {
    registrationData = {
      email: "person@canada.ca",
      firstname: "Person",
      lastname: "Example",
      requestId: "req-123",
    };

    render(<PasswordPageClient passwordComplexitySettings={{} as never} />);

    expect(
      screen.getByText("set-register-password:person@canada.ca:Person:Example:req-123")
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
