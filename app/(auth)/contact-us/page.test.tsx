import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ContactUsPage from "./page";

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("./components/ContactUsForm", () => ({
  ContactUsForm: ({ defaultIssueType }: { defaultIssueType?: string }) => (
    <div data-testid="contact-us-form" data-default-issue-type={defaultIssueType ?? ""}>
      contact-us-form
    </div>
  ),
}));

describe("contact-us page", () => {
  it("renders the contact us form", async () => {
    const view = await ContactUsPage({ searchParams: Promise.resolve({}) });
    render(view);

    expect(screen.getByText("contact-us-form")).toBeInTheDocument();
    expect(screen.getByTestId("contact-us-form")).toHaveAttribute("data-default-issue-type", "");
  });

  it("passes a valid issueType query param to the form", async () => {
    const view = await ContactUsPage({
      searchParams: Promise.resolve({ issueType: "mfa-issue" }),
    });
    render(view);

    expect(screen.getByTestId("contact-us-form")).toHaveAttribute(
      "data-default-issue-type",
      "mfa-issue"
    );
  });

  it("ignores an invalid issueType query param", async () => {
    const view = await ContactUsPage({
      searchParams: Promise.resolve({ issueType: "not-a-real-type" }),
    });
    render(view);

    expect(screen.getByTestId("contact-us-form")).toHaveAttribute("data-default-issue-type", "");
  });
});
