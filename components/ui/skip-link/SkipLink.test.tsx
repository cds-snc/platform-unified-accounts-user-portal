import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTranslationStub } from "@root/test/helpers/client";

import { SkipLink } from "./SkipLink";

vi.mock("@i18n/client", () => ({
  useTranslation: () => createTranslationStub(),
}));

vi.mock("next/link", () => ({
  default: () => {
    throw new Error("Skip links must use native fragment navigation");
  },
}));

describe("SkipLink", () => {
  it("uses a native anchor targeting the main content", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: "skip-link" });
    expect(link).toHaveAttribute("href", "#content");
    expect(link.tagName).toBe("A");
  });
});
