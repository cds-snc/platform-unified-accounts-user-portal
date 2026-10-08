import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import copy from "copy-to-clipboard";
import { describe, expect, it, vi } from "vitest";

import en from "@root/i18n/locales/en.json";
import fr from "@root/i18n/locales/fr.json";

import { CopyToClipboard } from "./CopyToClipboard";

vi.mock("copy-to-clipboard", () => ({ default: vi.fn(async () => true) }));

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === "set.copyLink" ? en.otp.set.copyLink : key === "set.copied" ? en.otp.set.copied : key,
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

  it("announces a successful copy without renaming the button", async () => {
    const user = userEvent.setup();
    render(<CopyToClipboard value="otpauth://totp/example" />);

    const button = screen.getByRole("button", { name: en.otp.set.copyLink });
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await user.click(button);

    expect(copy).toHaveBeenCalledWith("otpauth://totp/example");
    await waitFor(() => expect(status).toHaveTextContent(en.otp.set.copied));
    expect(button).toHaveAccessibleName(en.otp.set.copyLink);
    expect(fr.otp.set.copied).toBeTruthy();
  });

  it("does not announce success when copying fails", async () => {
    vi.mocked(copy).mockResolvedValueOnce(false);
    const user = userEvent.setup();
    render(<CopyToClipboard value="otpauth://totp/example" />);

    await user.click(screen.getByRole("button", { name: en.otp.set.copyLink }));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
