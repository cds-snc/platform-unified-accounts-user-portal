import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastContainer } from "@components/ui/toast/Toast";

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

  it("requests a resend without client-controlled data and shows a success toast for each resend", async () => {
    let finish!: (value: { success: true }) => void;
    vi.mocked(resendPasswordResetEmail).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(
      <>
        <ResendCode />
        <ToastContainer autoClose={false} containerId="default" />
      </>
    );

    const submit = screen.getByRole("button", { name: "password:reset.sent.resendLink" });
    await userEvent.click(submit);
    expect(resendPasswordResetEmail).toHaveBeenCalledExactlyOnceWith();
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(submit);
    expect(resendPasswordResetEmail).toHaveBeenCalledOnce();

    finish({ success: true });
    const successToast = await screen.findByRole("alert");
    expect(successToast).toHaveTextContent("translated:reset.sent.resendRequested");
    expect(successToast).toHaveClass("gc-toast--success");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    vi.mocked(resendPasswordResetEmail).mockResolvedValue({ success: true });
    await userEvent.click(submit);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
    expect(resendPasswordResetEmail).toHaveBeenCalledTimes(2);
  });

  it.each(["expired", "failed"])("shows an error when the request is %s", async (reason) => {
    if (reason === "expired") {
      vi.mocked(resendPasswordResetEmail).mockResolvedValue({
        error: "errors.couldNotSendResetLink",
      });
    } else {
      vi.mocked(resendPasswordResetEmail).mockRejectedValue(new Error("Network failure"));
    }
    render(
      <>
        <ResendCode />
        <ToastContainer autoClose={false} containerId="default" />
      </>
    );

    await userEvent.click(screen.getByRole("button", { name: "password:reset.sent.resendLink" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "translated:errors.couldNotSendResetLink"
    );
    expect(screen.queryByText("translated:reset.sent.resendRequested")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
