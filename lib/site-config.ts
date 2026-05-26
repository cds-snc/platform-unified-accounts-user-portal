/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { TRUSTED_DOMAINS, ZITADEL_ORGANIZATION } from "@root/constants/config";
import type { SiteConfig, SiteId, TrustedDomainConfig } from "@root/constants/site-config";

import { getOriginalHost } from "./server/host";
function normalizeHost(rawHost: string): string {
  return (
    rawHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/:\d+$/, "") || ""
  );
}

const TRUSTED_SITE_HOSTS = Object.values(TRUSTED_DOMAINS).map((config) => {
  return normalizeHost(config.baseUrl);
});

export class SiteConfigService {
  private static instance: SiteConfigService;
  private static resolvedHost: string;

  protected constructor(private readonly configById: Record<SiteId, TrustedDomainConfig>) {}

  static async getInstance() {
    // When running unit tests we need to recreate the instance
    if (!this.instance || process.env.NODE_ENV === "test") {
      this.instance = new SiteConfigService(TRUSTED_DOMAINS);
      SiteConfigService.resolvedHost = await getOriginalHost().then((host) => normalizeHost(host));
    }

    return this.instance;
  }

  requestHost(): SiteId {
    const ids = Object.keys(this.configById) as SiteId[];
    for (const id of ids) {
      const trustedHost = normalizeHost(this.configById[id].baseUrl);
      if (
        SiteConfigService.resolvedHost === trustedHost ||
        SiteConfigService.resolvedHost.endsWith(`.${trustedHost}`)
      ) {
        return id;
      }
    }
    return "authStaging";
  }

  resolve(): SiteConfig {
    const id = this.requestHost();
    const defaults = this.configById[id];

    return {
      id,
      baseUrl: defaults.baseUrl,
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    };
  }
}

const siteConfig = await SiteConfigService.getInstance();

export const requestHost = (): SiteId => siteConfig.requestHost();

export const resolveSiteConfigByHost = (): SiteConfig => siteConfig.resolve();

export const isTrustedSiteHost = (rawHost: string): boolean => {
  const normalizedHost = normalizeHost(rawHost);

  // Check for exact match
  if (TRUSTED_SITE_HOSTS.includes(normalizedHost)) {
    return true;
  }

  // Check if it's a subdomain of a trusted host
  return TRUSTED_SITE_HOSTS.some((trustedHost) => {
    return normalizedHost.endsWith(`.${trustedHost}`);
  });
};
