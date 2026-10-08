import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CodeEntry } from "./CodeEntry";

vi.mock("@i18n", () => ({
  I18n: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

describe("CodeEntry", () => {
  it("associates its hint with the code input", () => {
    render(<CodeEntry state={{}} />);

    const input = screen.getByRole("textbox", { name: /label/ });
    expect(input).toHaveAttribute("aria-describedby", "hint-codeHint");
    expect(input).toHaveAccessibleDescription("hint");
  });

  it("associates both the error and hint when the code is invalid", () => {
    render(
      <CodeEntry state={{ validationErrors: [{ fieldKey: "code", fieldValue: "Invalid code" }] }} />
    );

    const input = screen.getByRole("textbox", { name: /label/ });
    expect(input).toHaveAttribute("aria-describedby", "errorMessageCode hint-codeHint");
    expect(input).toHaveAccessibleDescription("Invalid code hint");
  });
});
