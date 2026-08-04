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
  ContactUsForm: () => <div>contact-us-form</div>,
}));

describe("contact-us page", () => {
  it("renders the contact us form", async () => {
    const view = await ContactUsPage();
    render(view);

    expect(screen.getByText("contact-us-form")).toBeInTheDocument();
  });
});
