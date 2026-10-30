import { act, render, screen, within } from "@testing-library/react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";
import { ResourceOwnerType } from "@zitadel/proto/zitadel/settings/v2/settings_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordComplexity } from "./PasswordComplexity";

const locale = vi.hoisted(() => ({ language: "en" as "en" | "fr" }));

vi.mock("@i18n", async () => {
  const { createInstance } = await import("i18next");
  const { default: en } = await import("@root/i18n/locales/en.json");
  const { default: fr } = await import("@root/i18n/locales/fr.json");
  const i18n = createInstance();
  await i18n.init({
    lng: "en",
    resources: { en: { password: en.password }, fr: { password: fr.password } },
  });
  const translators = {
    en: i18n.getFixedT("en", "password"),
    fr: i18n.getFixedT("fr", "password"),
  };
  return { useTranslation: () => ({ t: translators[locale.language] }) };
});

const settings: PasswordComplexitySettings = {
  $typeName: "zitadel.settings.v2.PasswordComplexitySettings",
  minLength: BigInt(8),
  requiresNumber: true,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresSymbol: true,
  resourceOwnerType: ResourceOwnerType.INSTANCE,
};

function checklist(password = "", ready = true, minLength = 8) {
  return (
    <PasswordComplexity
      passwordComplexitySettings={{ ...settings, minLength: BigInt(minLength) }}
      password={password}
      id="password-requirements"
      ready={ready}
    />
  );
}

function advance(milliseconds = 400) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

describe("PasswordComplexity announcements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    locale.language = "en";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with one empty status region and readable unmet states", () => {
    render(checklist("", false));
    advance();

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getAllByText("Not yet met")).toHaveLength(5);
  });

  it("updates checklist states immediately but waits 400 ms to announce changes", () => {
    const { rerender } = render(checklist());
    rerender(checklist("1"));

    expect(within(screen.getByTestId("number-check")).getByText("Met")).toBeInTheDocument();
    advance(399);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    advance(1);
    expect(screen.getByRole("status").textContent).toBe("A number: requirement met.");
  });

  it("announces when a previously met requirement becomes unmet", () => {
    const { rerender } = render(checklist());
    rerender(checklist("1"));
    advance();
    rerender(checklist());
    advance();

    expect(screen.getByRole("status").textContent).toBe("A number: requirement no longer met.");
    expect(within(screen.getByTestId("number-check")).getByText("Not yet met")).toBeInTheDocument();
  });

  it("combines changed requirements without announcing unchanged unmet requirements", () => {
    const { rerender } = render(checklist());
    rerender(checklist("a1"));
    advance();

    expect(screen.getByRole("status").textContent).toBe(
      "A number: requirement met. A lowercase letter: requirement met."
    );
  });

  it("announces only the summary when a pasted password meets all requirements", () => {
    const { rerender } = render(checklist());
    rerender(checklist("Abcdef1!"));
    advance();

    expect(screen.getByRole("status").textContent).toBe("All password requirements met.");
    expect(screen.getAllByText("Met")).toHaveLength(5);
  });

  it("restarts the debounce on keystrokes that do not change requirement states", () => {
    const { rerender } = render(checklist());
    rerender(checklist("1"));
    advance(300);
    rerender(checklist("12"));
    advance(399);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    advance(1);
    expect(screen.getByRole("status").textContent).toBe("A number: requirement met.");
  });

  it("does not announce a requirement that is met and undone before the debounce finishes", () => {
    const { rerender } = render(checklist());
    rerender(checklist("1"));
    advance(200);
    rerender(checklist());
    advance();

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("compares changes with the last announced state rather than intermediate keystrokes", () => {
    const { rerender } = render(checklist());
    rerender(checklist("1"));
    advance();
    rerender(checklist("a"));
    advance(200);
    rerender(checklist("a1"));
    advance();

    expect(screen.getByRole("status").textContent).toBe("A lowercase letter: requirement met.");
  });

  it("includes the minimum length in announcements", () => {
    const { rerender } = render(checklist("", true, 10));
    rerender(checklist("1234567890", true, 10));
    advance();

    expect(screen.getByRole("status").textContent).toBe(
      "At least 10 characters: requirement met. A number: requirement met."
    );
  });

  it("cancels pending announcements when the form is no longer ready", () => {
    const { rerender } = render(checklist());
    rerender(checklist("1"));
    advance(200);
    rerender(checklist("1", false));
    advance();

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("cleans up the debounce on unmount", () => {
    const { rerender, unmount } = render(checklist());
    rerender(checklist("1"));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("localizes announcements and persistent states in French", () => {
    locale.language = "fr";
    const { rerender } = render(checklist());
    expect(screen.getAllByText("Pas encore respectée")).toHaveLength(5);
    rerender(checklist("1"));
    advance();
    expect(screen.getByRole("status").textContent).toBe("Un chiffre : exigence respectée.");
    rerender(checklist());
    advance();
    expect(screen.getByRole("status").textContent).toBe(
      "Un chiffre : exigence qui n'est plus respectée."
    );
    rerender(checklist("Abcdef1!"));
    advance();
    expect(screen.getByRole("status").textContent).toBe(
      "Toutes les exigences du mot de passe sont respectées."
    );
  });
});
