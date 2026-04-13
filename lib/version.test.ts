import { describe, expect, it } from "vitest";

import { getShortVersion } from "./version";

describe("getShortVersion", () => {
  it("shortens SHA-like versions to 7 characters", () => {
    expect(getShortVersion("abcdef1234567890")).toBe("abcdef1");
  });

  it("keeps non-SHA versions unchanged", () => {
    expect(getShortVersion("2026-04-13T12:34:56.000Z")).toBe("2026-04-13T12:34:56.000Z");
    expect(getShortVersion("release-2026-04-13")).toBe("release-2026-04-13");
  });
});
