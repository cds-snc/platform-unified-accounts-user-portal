import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import en from "@root/i18n/locales/en.json";
import fr from "@root/i18n/locales/fr.json";

import { CopyToClipboard } from "./CopyToClipboard";

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "set.copyLink" ? en.otp.set.copyLink : key),
  }),
}));

describe("CopyToClipboard", () => {
  it("names the icon-only button using a localized label", () => {
    render(<CopyToClipboard value="otpauth://totp/example" />);

    expect(screen.getByRole("button", { name: en.otp.set.copyLink })).toHaveAttribute(
      "type",
      "button"
    );
    expect(fr.otp.set.copyLink).toBeTruthy();
  });
});
