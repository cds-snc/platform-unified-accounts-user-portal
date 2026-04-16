import { afterEach, describe, expect, it } from "vitest";

import { checkEmailVerification } from "./verify-helper";

describe("checkEmailVerification", () => {
  const originalEmailVerification = process.env.EMAIL_VERIFICATION;

  afterEach(() => {
    process.env.EMAIL_VERIFICATION = originalEmailVerification;
  });

  it("preserves user and organization context for verify redirects", () => {
    process.env.EMAIL_VERIFICATION = "true";

    const redirect = checkEmailVerification(
      {
        factors: {
          user: {
            id: "user-123",
            loginName: "person@canada.ca",
            organizationId: "org-1",
          },
        },
      } as never,
      {
        email: {
          isVerified: false,
        },
      } as never,
      "org-1",
      "oidc_req-123"
    );

    expect(redirect).toEqual({
      redirect: "/verify?requestId=oidc_req-123&userId=user-123&send=true&organization=org-1",
    });
  });
});
