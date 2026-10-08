import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExternalLink } from "./ExternalLink";

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "externalLinkIconLabel" ? "Opens in a new tab" : "GC Forms"),
    i18n: { language: "en" },
  }),
}));

describe("ExternalLink", () => {
  it("describes the new tab on the link while hiding its decorative icon", () => {
    const { container } = render(
      <ExternalLink href="https://example.com" i18nKey="gcForms" namespace="common" />
    );

    expect(screen.getByRole("link", { name: "GC Forms" })).toHaveAccessibleDescription(
      "Opens in a new tab"
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".gcds-icon-external")).toHaveAttribute("aria-hidden", "true");
  });
});
