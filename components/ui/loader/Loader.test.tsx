import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { serverTranslation } from "@i18n/server";

import { Loader } from "./Loader";

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(async () => ({
    t: (key: string) => (key === "loading" ? "Chargement..." : key),
  })),
}));

describe("Loader", () => {
  it("provides a translated status message and hides the decorative spinner", async () => {
    render(await Loader({}));

    const status = screen.getByRole("status");
    expect(serverTranslation).toHaveBeenCalledWith();
    expect(status).toHaveTextContent("Chargement...");
    expect(status.querySelector(".animate-spin")).toHaveAttribute("aria-hidden", "true");
  });

  it("preserves a supplied loading message", async () => {
    render(await Loader({ message: "Loading your account" }));

    expect(screen.getByRole("status")).toHaveTextContent("Loading your account");
    expect(screen.queryByText("Chargement...")).not.toBeInTheDocument();
  });
});
