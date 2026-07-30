import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTranslation } from "@i18n";

import { createTranslationStub } from "../../../../test/helpers/client";

import { ContactUsForm } from "./ContactUsForm";

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

describe("ContactUsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTranslation).mockReturnValue(createTranslationStub() as never);
  });

  it("renders all form fields", () => {
    render(<ContactUsForm />);

    expect(screen.getByLabelText(/labels.fullName/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/labels.email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/labels.message/i)).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows validation errors when form is submitted empty", async () => {
    const user = userEvent.setup();

    render(<ContactUsForm />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("validation.requiredFullName")).toBeInTheDocument();
      expect(screen.getByText("validation.requiredEmail")).toBeInTheDocument();
      expect(screen.getByText("validation.requiredMessage")).toBeInTheDocument();
    });
  });

  it("shows email validation error when an invalid email is entered", async () => {
    const user = userEvent.setup();

    render(<ContactUsForm />);

    await user.type(screen.getByLabelText(/labels.fullName/i), "Test User");
    await user.type(screen.getByLabelText(/labels.email/i), "not-an-email");
    await user.type(screen.getByLabelText(/labels.message/i), "Hello there");
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("validation.invalidEmail")).toBeInTheDocument();
    });
  });

  it("shows success alert after valid form submission", async () => {
    const user = userEvent.setup();

    render(<ContactUsForm />);

    await user.type(screen.getByLabelText(/labels.fullName/i), "Test User");
    await user.type(screen.getByLabelText(/labels.email/i), "test@canada.ca");
    await user.type(screen.getByLabelText(/labels.message/i), "Hello there");
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("success.title")).toBeInTheDocument();
      expect(screen.getByText("success.description")).toBeInTheDocument();
    });
  });

  it("hides the form after successful submission", async () => {
    const user = userEvent.setup();

    render(<ContactUsForm />);

    await user.type(screen.getByLabelText(/labels.fullName/i), "Test User");
    await user.type(screen.getByLabelText(/labels.email/i), "test@canada.ca");
    await user.type(screen.getByLabelText(/labels.message/i), "Hello there");
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  });
});
