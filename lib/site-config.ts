/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ZITADEL_ORGANIZATION } from "@root/constants/config";

export type SiteId = "forms_dev" | "forms_staging" | "forms_production";

export type SiteConfig = {
  id: SiteId;
  baseUrl: string;
  zitadelOrganizationId: string;
};

const SITE_CONFIG_BY_ID: Record<SiteId, Pick<SiteConfig, "baseUrl">> = {
  forms_dev: {
    baseUrl: "http://localhost:3000",
  },
  forms_staging: {
    baseUrl: "https://forms-staging.cdssandbox.xyz/",
  },
  forms_production: {
    baseUrl: "https://forms-formulaires.alpha.canada.ca/",
  },
};

function normalizeHost(rawHost: string): string {
  return (
    rawHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0] || ""
  );
}

class SiteConfigService {
  private static instance: SiteConfigService;

  private constructor(private readonly configById: Record<SiteId, Pick<SiteConfig, "baseUrl">>) {}

  static getInstance() {
    if (!SiteConfigService.instance) {
      SiteConfigService.instance = new SiteConfigService(SITE_CONFIG_BY_ID);
    }

    return SiteConfigService.instance;
  }

  requestHost(host: string): SiteId {
    if (host.includes("forms-staging") || process.env.REVIEW_ENV) {
      return "forms_staging";
    } else if (host.includes("localhost") || host === "") {
      return "forms_dev";
    } else {
      return "forms_production";
    }
  }

  resolve(rawHost: string): SiteConfig {
    const id = this.requestHost(normalizeHost(rawHost));
    const defaults = this.configById[id];

    return {
      id,
      baseUrl: defaults.baseUrl,
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    };
  }
}

export const siteConfig = SiteConfigService.getInstance();

export const requestHost = (host: string): SiteId => siteConfig.requestHost(host);

export const resolveSiteConfigByHost = (rawHost: string): SiteConfig => siteConfig.resolve(rawHost);
