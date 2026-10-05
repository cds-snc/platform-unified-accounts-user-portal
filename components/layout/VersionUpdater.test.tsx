import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTranslationStub } from "@root/test/helpers/client";
import { useAppStatus } from "@lib/client/useAppStatus";

import { VersionUpdater } from "./VersionUpdater";

vi.mock("@i18n/client", () => ({
  useTranslation: () => createTranslationStub(),
}));

vi.mock("@lib/client/useAppStatus", () => ({
  useAppStatus: vi.fn(),
}));

describe("VersionUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when the deployed version has not changed", () => {
    vi.mocked(useAppStatus).mockReturnValue({
      updateRequired: false,
      updateTriggered: false,
      serviceError: false,
    });

    render(<VersionUpdater />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("version-updater-debug")).not.toBeInTheDocument();
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

    vi.mocked(useAppStatus).mockReturnValue({
      updateRequired: true,
      updateTriggered: false,
      serviceError: false,
    });

    render(<VersionUpdater />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "refreshNow" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
