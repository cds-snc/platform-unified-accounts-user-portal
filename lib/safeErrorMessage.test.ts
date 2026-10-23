import { describe, expect, it } from "vitest";

import { getSafeErrorMessageFromKey } from "./safeErrorMessage";

const t = (key: string) => `translated:${key}`;
const allowedErrorKeys = ["set.invalidCode", "set.genericError"];

describe("getSafeErrorMessageFromKey", () => {
  it("translates an allowed key", () => {
    expect(
      getSafeErrorMessageFromKey({
        errorKey: "set.invalidCode",
        fallbackKey: "set.genericError",
        allowedErrorKeys,
        t,
      })
    ).toBe("translated:set.invalidCode");
  });

  it.each([["set.somethingElse"], [""], [undefined]])(
    "translates the fallback key for a disallowed or missing key (%s)",
    (errorKey) => {
      expect(
        getSafeErrorMessageFromKey({
          errorKey,
          fallbackKey: "set.genericError",
          allowedErrorKeys,
          t,
        })
      ).toBe("translated:set.genericError");
    }
  );
});
