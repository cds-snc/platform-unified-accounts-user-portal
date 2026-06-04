/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { TRUSTED_DOMAINS, ZITADEL_ORGANIZATION } from "@root/constants/config";
import type {
  SiteConfig,
  SiteId,
  SiteLinkKey,
  TrustedDomainConfig,
} from "@root/constants/site-config";
import { serverTranslation } from "@i18n/server";

import { getOriginalHost, normalizeHost } from "./server/host";

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

export const resolveSiteConfigByHost = (): SiteConfig => siteConfig.resolve();

export const getSiteLink = async <K extends SiteLinkKey>(linkKey: K): Promise<string | false> => {
  const currentConfig = resolveSiteConfigByHost();
  const linkTemplate = resolveSiteLinkTemplate(currentConfig, linkKey);
  const {
    i18n: { language },
  } = await serverTranslation();

  if (linkTemplate === false) {
    return false;
  }

  return linkTemplate
    .replaceAll("{baseUrl}", currentConfig.baseUrl)
    .replaceAll("{locale}", language ?? "en");
};

function resolveSiteLinkTemplate(site: Pick<SiteConfig, "id" | "baseUrl">, linkKey: SiteLinkKey) {
  const links = TRUSTED_DOMAINS[site.id].links;
  return links[linkKey];
}
