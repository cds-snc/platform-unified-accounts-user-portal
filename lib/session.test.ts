import { describe, expect, it, vi } from "vitest";

import { getUserByID } from "../lib/zitadel";

import { isSessionValid } from "./session";

vi.mock("../lib/zitadel", () => ({
  getSession: vi.fn(),
  getUserByID: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
}));

describe("isSessionValid", () => {
  it("returns false instead of throwing when user lookup fails during email verification", async () => {
    vi.mocked(getUserByID).mockRejectedValue(new Error("[not_found] User could not be found"));

    const validSession = {
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        totp: { verifiedAt: {} },
      },
    } as never;

    await expect(
      isSessionValid({
        serviceUrl: "https://example.com",
        session: validSession,
      })
    ).resolves.toBe(false);
  });
});
