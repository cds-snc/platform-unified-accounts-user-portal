import { describe, expect, it } from "vitest";

import { checkEmailVerification } from "./verify-helper";

describe("checkEmailVerification", () => {
  it("preserves user and organization context for verify redirects", () => {
    const redirect = checkEmailVerification(
      {
        email: {
          isVerified: false,
        },
      } as never,
      "oidc_req-123"
    );

    expect(redirect).toEqual({
      redirect: "/register/verify?requestId=oidc_req-123",
    });
  });
});
