import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MethodOptionCard } from "./MethodOptionCard";

const props = {
  method: "authenticator",
  title: "Authenticator app",
  icon: "/img/verified_user_24px.png",
  description: "Use an authenticator app",
  isSelected: false,
  onSelect: vi.fn(),
  url: "/otp/time-based",
};

describe("MethodOptionCard", () => {
  it("exposes selection as a pressed button without duplicating the checkmark text", () => {
    const { rerender } = render(<MethodOptionCard {...props} />);
    const button = screen.getByRole("button", { name: /Authenticator app/ });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-pressed", "false");

    rerender(<MethodOptionCard {...props} isSelected />);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByAltText("")).toBeInTheDocument();
  });

  it("selects by click, Enter, and Space without submitting its parent form", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <MethodOptionCard {...props} onSelect={onSelect} />
      </form>
    );
    const button = screen.getByRole("button", { name: /Authenticator app/ });

    await user.click(button);
    button.focus();
    await user.keyboard("{Enter} ");

    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenCalledWith("authenticator", "/otp/time-based");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
