import { describe, expect, it } from "vitest";

import { toAuthRequestId, toOidcRequestId } from "./oidc-request-id";

describe("oidc-request-id", () => {
  it("returns bare auth request id for unprefixed value", () => {
    expect(toAuthRequestId("12345")).toBe("12345");
  });

  it("strips one or multiple oidc_ prefixes for auth request id", () => {
    expect(toAuthRequestId("oidc_12345")).toBe("12345");
    expect(toAuthRequestId("oidc_oidc_12345")).toBe("12345");
  });

  it("returns canonical prefixed request id", () => {
    expect(toOidcRequestId("12345")).toBe("oidc_12345");
    expect(toOidcRequestId("oidc_12345")).toBe("oidc_12345");
    expect(toOidcRequestId("oidc_oidc_12345")).toBe("oidc_12345");
  });
});
