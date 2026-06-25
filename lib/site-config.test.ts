import { beforeEach, describe, expect, it, vi } from "vitest";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { getOriginalHost } from "@lib/server/host";

import { SiteConfigService } from "./site-config";

vi.mock("./server/host", async (importActual) => {
  const actual = await importActual<typeof import("./server/host")>();
  return {
    normalizeHost: actual.normalizeHost,
    getOriginalHost: vi.fn(async () => ""),
  };
});

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
});
