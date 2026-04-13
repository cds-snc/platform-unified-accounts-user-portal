import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTranslationStub } from "@root/test/helpers/client";

import { useVersionUpdater } from "./useVersionUpdater";
import { VersionUpdater } from "./VersionUpdater";

vi.mock("@i18n/client", () => ({
  useTranslation: () => createTranslationStub(),
}));

vi.mock("./useVersionUpdater", () => ({
  useVersionUpdater: vi.fn(),
}));

describe("VersionUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when the deployed version has not changed", () => {
    vi.mocked(useVersionUpdater).mockReturnValue({
      latestVersion: "abc1234",
      previousVersion: null,
      didChange: false,
    });

    render(<VersionUpdater />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a refresh dialog and reloads when the user confirms", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        reload,
      },
    });

    vi.mocked(useVersionUpdater).mockReturnValue({
      latestVersion: "def5678",
      previousVersion: "abc1234",
      didChange: true,
    });

    render(<VersionUpdater />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "refreshNow" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("dismisses the dialog when the user closes it", async () => {
    vi.mocked(useVersionUpdater).mockReturnValue({
      latestVersion: "def5678",
      previousVersion: "abc1234",
      didChange: true,
    });

    render(<VersionUpdater />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
