import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MfaUnavailableCta } from "./MfaUnavailableCta";

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(async () => ({
    t: (key: string) => key,
  })),
}));

describe("MfaUnavailableCta", () => {
  it("renders the explanation text and a contact us link", async () => {
    render(await MfaUnavailableCta());

    expect(screen.getByTestId("mfa-unavailable-cta")).toHaveTextContent("unavailable.text");
    expect(screen.getByTestId("mfa-unavailable-contact-us")).toHaveTextContent("unavailable.link");
  });

  it("links to the same contact us page as the footer", async () => {
    render(await MfaUnavailableCta());

    expect(screen.getByTestId("mfa-unavailable-contact-us")).toHaveAttribute("href", "/contact-us");
  });
});
