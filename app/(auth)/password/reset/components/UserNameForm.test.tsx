import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateUsername } from "@lib/validation/validationSchemas";
import { useTranslation } from "@i18n/client";

import { submitUserNameForm } from "../actions";

import { UserNameForm } from "./UserNameForm";

vi.mock("@i18n/client", () => ({
  useTranslation: vi.fn(),
  LANGUAGE_COOKIE_NAME: "i18next",
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateUsername: vi.fn(),
}));

vi.mock("../actions", () => ({
  submitUserNameForm: vi.fn(() => Promise.resolve()),
}));

describe("UserNameForm", () => {
  const router = {
    push: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string) => key,
    } as never);

    vi.mocked(validateUsername).mockResolvedValue({ success: true } as never);
  });

  it("renders username field and continue button", () => {
    const { getByLabelText, getByText, getByRole } = render(<UserNameForm requestId="req-123" />);

    expect(getByLabelText(/form\.label/i)).toBeInTheDocument();
    expect(getByText("form.description")).toBeInTheDocument();
    expect(getByRole("button", { name: "button.continue" })).toBeInTheDocument();
  });

  it("shows validation error and does not submit when username is invalid", async () => {
    vi.mocked(validateUsername).mockResolvedValue({
      success: false,
      issues: [{ path: [{ key: "username" }], message: "requiredUsername" }],
    } as never);

    const { getByRole, getByText } = render(<UserNameForm requestId="req-123" />);

    await userEvent.click(getByRole("button", { name: "button.continue" }));

    await vi.waitFor(() => {
      expect(getByText("validation.requiredUsername")).toBeInTheDocument();
    });

    expect(submitUserNameForm).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("submits username and redirects when action succeeds", async () => {
    const { getByLabelText, getByRole } = render(<UserNameForm requestId="req-123" />);

    await userEvent.type(getByLabelText(/form\.label/i), "person@canada.ca");
    await userEvent.click(getByRole("button", { name: "button.continue" }));
    expect(submitUserNameForm).toHaveBeenCalledWith({
      loginName: "person@canada.ca",

      requestId: "req-123",
    });
  });

  it("shows generic error when action returns disallowed error text", async () => {
    vi.mocked(submitUserNameForm).mockResolvedValue({ error: "raw backend message" } as never);

    const { getByLabelText, getByRole, getAllByText, queryByText } = render(
      <UserNameForm requestId="req-123" />
    );

    await userEvent.type(getByLabelText(/form\.label/i), "person@canada.ca");
    await userEvent.click(getByRole("button", { name: "button.continue" }));

    await vi.waitFor(() => {
      expect(getAllByText("title").length).toBeGreaterThan(0);
    });

    expect(queryByText("raw backend message")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
