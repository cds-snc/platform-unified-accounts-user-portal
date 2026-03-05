import { describe, expect, it } from "vitest";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";

import { requestHost, resolveSiteConfigByHost } from "./site-config";

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
});
