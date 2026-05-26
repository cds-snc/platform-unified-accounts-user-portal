import { beforeEach, describe, expect, it, vi } from "vitest";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { getOriginalHost } from "@lib/server/host";

import { isTrustedSiteHost, SiteConfigService } from "./site-config";

vi.mock("./server/host", () => ({
  getOriginalHost: vi.fn(async () => ""),
}));

describe("site-config", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it("classifies localhost hosts as dev", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("localhost");
    const mocked = await SiteConfigService.getInstance();
    expect(mocked.requestHost()).toBe("dev");
  });

  it("classifies auth-staging hosts as staging", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("auth.cdssandbox.xyz");
    const mocked = await SiteConfigService.getInstance();
    expect(mocked.requestHost()).toBe("authStaging");
  });

  it("classifies forms-staging hosts as staging", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("forms-staging.cdssandbox.xyz");
    const mocked = await SiteConfigService.getInstance();
    expect(mocked.requestHost()).toBe("formsStaging");
  });

  it("classifies forms-production hosts as production", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("forms-formulaires.alpha.canada.ca");
    const mocked = await SiteConfigService.getInstance();
    expect(mocked.requestHost()).toBe("formsProduction");
  });

  it("resolves dev baseUrl from localhost host", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("localhost:3000");
    const mocked = await SiteConfigService.getInstance();
    const config = mocked.resolve();
    expect(config).toEqual({
      id: "dev",
      baseUrl: "http://localhost:3000",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  it("resolves auth-staging baseUrl from auth-staging host", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("auth.cdssandbox.xyz");
    const mocked = await SiteConfigService.getInstance();
    const config = mocked.resolve();
    expect(config).toEqual({
      id: "authStaging",
      baseUrl: "https://auth.cdssandbox.xyz",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  it("resolves forms-staging baseUrl from forms-staging host", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("https://forms-staging.cdssandbox.xyz/some/path");
    const mocked = await SiteConfigService.getInstance();
    const config = mocked.resolve();
    expect(config).toEqual({
      id: "formsStaging",
      baseUrl: "https://forms-staging.cdssandbox.xyz",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  it("resolves forms-production baseUrl from production host", async () => {
    vi.mocked(getOriginalHost).mockResolvedValue("forms-formulaires.alpha.canada.ca");
    const mocked = await SiteConfigService.getInstance();
    const config = mocked.resolve();
    expect(config).toEqual({
      id: "formsProduction",
      baseUrl: "https://forms-formulaires.alpha.canada.ca",
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    });
  });

  describe("isTrustedSiteHost", () => {
    it("trusts exact matches for localhost", () => {
      expect(isTrustedSiteHost("localhost:3000")).toBe(true);
      expect(isTrustedSiteHost("http://localhost:3000")).toBe(true);
    });

    it("trusts exact matches for auth-staging", () => {
      expect(isTrustedSiteHost("auth.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://auth.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://auth.cdssandbox.xyz/ui/v2")).toBe(true);
    });

    it("trusts exact matches for forms-staging", () => {
      expect(isTrustedSiteHost("forms-staging.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://forms-staging.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://forms-staging.cdssandbox.xyz/ui/v2")).toBe(true);
    });

    it("trusts exact matches for forms-production", () => {
      expect(isTrustedSiteHost("forms-formulaires.alpha.canada.ca")).toBe(true);
      expect(isTrustedSiteHost("https://forms-formulaires.alpha.canada.ca")).toBe(true);
    });

    it("trusts subdomains of auth-staging", () => {
      expect(isTrustedSiteHost("auth.auth.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://auth.auth.cdssandbox.xyz/ui/v2")).toBe(true);
      expect(isTrustedSiteHost("my-custom.auth.cdssandbox.xyz")).toBe(true);
    });

    it("trusts subdomains of forms-staging", () => {
      expect(isTrustedSiteHost("auth.forms-staging.cdssandbox.xyz")).toBe(true);
      expect(isTrustedSiteHost("https://auth.forms-staging.cdssandbox.xyz/ui/v2")).toBe(true);
      expect(isTrustedSiteHost("my-custom.forms-staging.cdssandbox.xyz")).toBe(true);
    });

    it("trusts subdomains of forms-production", () => {
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
