import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PrivacyPolicyPage from "./page";

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@i18n/utils", () => ({
  getCurrentLanguage: vi.fn(async () => "en"),
}));

vi.mock("./components/PrivacyPolicyContentEn", () => ({
  PrivacyPolicyContentEn: () => <div>privacy-policy-en</div>,
}));

vi.mock("./components/PrivacyPolicyContentFr", () => ({
  PrivacyPolicyContentFr: () => <div>privacy-policy-fr</div>,
}));

describe("privacy-policy page", () => {
  it("renders the privacy policy placeholder container", async () => {
    const view = await PrivacyPolicyPage();
    render(view);

    expect(screen.getByTestId("privacy-policy-content")).toBeInTheDocument();
    expect(screen.getByText("privacy-policy-en")).toBeInTheDocument();
  });
});
