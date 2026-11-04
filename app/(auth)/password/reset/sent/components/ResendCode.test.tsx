import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resendPasswordResetEmail } from "../../actions";

import { ResendCode } from "./ResendCode";

vi.mock("../../actions", () => ({
  resendPasswordResetEmail: vi.fn(),
}));

vi.mock("@i18n", () => ({
  I18n: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({ t: (key: string) => `translated:${key}` }),
}));

vi.mock("@components/contexts/SiteConfigContext", () => ({
  useSiteConfig: () => ({ getSiteLink: () => "https://example.ca/support" }),
}));

describe("ResendCode", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requests a resend without passing any client-controlled data and announces the result", async () => {
    let finish!: (value: { success: true }) => void;
    vi.mocked(resendPasswordResetEmail).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(<ResendCode />);

    const submit = screen.getByRole("button", { name: "reset.sent.resendLink" });
    await userEvent.click(submit);
    expect(resendPasswordResetEmail).toHaveBeenCalledExactlyOnceWith();
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(submit);
    expect(resendPasswordResetEmail).toHaveBeenCalledOnce();

    finish({ success: true });
    expect(await screen.findByRole("status")).toHaveTextContent("reset.sent.resendRequested");
  });

  it.each(["expired", "failed"])("shows an error when the request is %s", async (reason) => {
    if (reason === "expired") {
      vi.mocked(resendPasswordResetEmail).mockResolvedValue({
        error: "errors.couldNotSendResetLink",
      });
    } else {
      vi.mocked(resendPasswordResetEmail).mockRejectedValue(new Error("Network failure"));
    }
    render(<ResendCode />);

    await userEvent.click(screen.getByRole("button", { name: "reset.sent.resendLink" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "translated:errors.couldNotSendResetLink"
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
