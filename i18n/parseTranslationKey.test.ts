import { beforeEach, describe, expect, it, vi } from "vitest";

import { logMessage } from "@lib/logger";

import { parseTranslationKey } from "./parseTranslationKey";

vi.mock("@lib/logger", () => ({ logMessage: { warn: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseTranslationKey", () => {
  it.each([
    ["required", "common", "required"],
    ["button.back", "common", "button.back"],
    ["common:required", "common", "required"],
    ["password:create.passwordHint", "password", "create.passwordHint"],
    ["contact-us:title", "contact-us", "title"],
    ["404:title", "404", "title"],
  ])("parses %s without a warning", (input, namespace, key) => {
    expect(parseTranslationKey(input)).toEqual({ namespace, key });
    expect(logMessage.warn).not.toHaveBeenCalled();
  });

  it.each([
    "",
    " ",
    " required",
    "required ",
    "pass word:hint",
    "password: hint",
    "required\n",
    "required\t",
  ])("preserves invalid string %j in the fallback and warning", (input) => {
    expect(parseTranslationKey(input)).toEqual({ namespace: "common", key: input });
    expect(logMessage.warn).toHaveBeenCalledExactlyOnceWith(
      "Invalid translation key. Falling back to common namespace.",
      { translationKey: input }
    );
  });

  it.each([":required", "password:", ":", "password:foo:bar", "password:hint:"])(
    "preserves malformed string %j in the fallback and warning",
    (input) => {
      expect(parseTranslationKey(input)).toEqual({ namespace: "common", key: input });
      expect(logMessage.warn).toHaveBeenCalledExactlyOnceWith(
        "Malformed translation key. Falling back to common namespace.",
        { translationKey: input }
      );
    }
  );

  it.each([
    { label: "undefined", input: undefined, loggedKey: null },
    { label: "null", input: null, loggedKey: null },
    { label: "zero", input: 0, loggedKey: 0 },
    { label: "finite number", input: 123, loggedKey: 123 },
    { label: "NaN", input: NaN, loggedKey: "NaN" },
    { label: "Infinity", input: Infinity, loggedKey: "Infinity" },
    { label: "negative Infinity", input: -Infinity, loggedKey: "-Infinity" },
    { label: "boolean", input: false, loggedKey: "[boolean]" },
    { label: "BigInt", input: BigInt(123), loggedKey: "[bigint]" },
    { label: "symbol", input: Symbol("key"), loggedKey: "[symbol]" },
    { label: "array", input: ["required"], loggedKey: "[object]" },
    { label: "object", input: { key: "required" }, loggedKey: "[object]" },
    { label: "function", input: () => "required", loggedKey: "[function]" },
  ])("returns an empty fallback and safely logs $label", ({ input, loggedKey }) => {
    expect(parseTranslationKey(input)).toEqual({ namespace: "common", key: "" });
    expect(logMessage.warn).toHaveBeenCalledExactlyOnceWith(
      "Invalid translation key. Falling back to common namespace.",
      { translationKey: loggedKey }
    );
  });

  it("does not pass circular objects to the logger", () => {
    const input: Record<string, unknown> = {};
    input.self = input;

    expect(parseTranslationKey(input)).toEqual({ namespace: "common", key: "" });
    expect(logMessage.warn).toHaveBeenCalledExactlyOnceWith(
      "Invalid translation key. Falling back to common namespace.",
      { translationKey: "[object]" }
    );
  });

  it("does not call serialization methods on invalid input", () => {
    const input = {
      toJSON: vi.fn(() => {
        throw new Error("Unexpected serialization");
      }),
      toString: vi.fn(() => {
        throw new Error("Unexpected string conversion");
      }),
    };

    expect(parseTranslationKey(input)).toEqual({ namespace: "common", key: "" });
    expect(input.toJSON).not.toHaveBeenCalled();
    expect(input.toString).not.toHaveBeenCalled();
    expect(logMessage.warn).toHaveBeenCalledExactlyOnceWith(
      "Invalid translation key. Falling back to common namespace.",
      { translationKey: "[object]" }
    );
  });
});
