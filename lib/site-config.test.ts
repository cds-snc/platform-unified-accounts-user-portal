import { describe, expect, it } from "vitest";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";

import { isTrustedSiteHost, requestHost, resolveSiteConfigByHost } from "./site-config";

describe("site-config", () => {
  it("classifies localhost hosts as forms_dev", () => {
    expect(requestHost("localhost:3002")).toBe("forms_dev");
    expect(requestHost("127.0.0.1:3002")).toBe("forms_production");
  });

  it("classifies forms-staging hosts as forms_staging", () => {
    expect(requestHost("forms-staging.cdssandbox.xyz")).toBe("forms_staging");
  });

  it("classifies other hosts as forms_production", () => {
    expect(requestHost("forms-formulaires.alpha.canada.ca")).toBe("forms_production");
  });

  it("resolves dev baseUrl from localhost host", () => {
    const config = resolveSiteConfigByHost("localhost:3002");

    expect(config).toEqual({
      id: "forms_dev",
      productId: "gcforms",
      baseUrl: "http://localhost:3000",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  it("resolves staging baseUrl from forms-staging host", () => {
    const config = resolveSiteConfigByHost("https://forms-staging.cdssandbox.xyz/some/path");

    expect(config).toEqual({
      id: "forms_staging",
      productId: "gcforms",
      baseUrl: "https://forms-staging.cdssandbox.xyz",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  it("resolves production baseUrl from production host", () => {
    const config = resolveSiteConfigByHost("forms-formulaires.alpha.canada.ca");

    expect(config).toEqual({
      id: "forms_production",
      productId: "gcforms",
      baseUrl: "https://forms-formulaires.alpha.canada.ca",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  describe("isTrustedSiteHost", () => {
    it("trusts exact matches for localhost", () => {
      expect(isTrustedSiteHost("localhost:3000")).toBe(true);
      expect(isTrustedSiteHost("http://localhost:3000")).toBe(true);
    });

    it("trusts exact matches for staging", () => {
      expect(isTrustedSiteHost("forms-staging.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://forms-staging.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://forms-staging.cdssandbox.xyz/ui/v2")).toBe(true);
    });

    it("trusts exact matches for production", () => {
      expect(isTrustedSiteHost("forms-formulaires.alpha.canada.ca")).toBe(true);
      expect(isTrustedSiteHost("https://forms-formulaires.alpha.canada.ca")).toBe(true);
    });

    it("trusts subdomains of staging", () => {
      expect(isTrustedSiteHost("auth.forms-staging.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://auth.forms-staging.cdssandbox.xyz/ui/v2")).toBe(true);
      expect(isTrustedSiteHost("my-custom.forms-staging.cdssandbox.xyz")).toBe(true);
    });

    it("trusts subdomains of production", () => {
      expect(isTrustedSiteHost("auth.forms-formulaires.alpha.canada.ca")).toBe(true);
      expect(isTrustedSiteHost("https://auth.forms-formulaires.alpha.canada.ca")).toBe(true);
    });

    it("rejects untrusted hosts", () => {
      expect(isTrustedSiteHost("evil.com")).toBe(false);
      expect(isTrustedSiteHost("forms-staging.evil.com")).toBe(false);
      expect(isTrustedSiteHost("https://malicious.xyz")).toBe(false);
    });

    it("normalizes hosts before checking trust", () => {
      expect(isTrustedSiteHost("HTTPS://AUTH.FORMS-STAGING.CDSSANDBOX.XYZ")).toBe(true);
      expect(isTrustedSiteHost("  forms-staging.cdssandbox.xyz  ")).toBe(true);
    });
  });
});
