/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import {
  type SiteConfig,
  type SiteDefinition,
  type SiteId,
  SITES,
} from "@root/constants/site-config";

import { getOriginalHost, normalizeHost } from "./server/host";

// Provides the site configuration for the different links between
// Staging and Production
export class SiteConfigService {
  private static instance: SiteConfigService;
  private static resolvedHost: string;

  protected constructor(private readonly configById: Record<SiteId, SiteDefinition>) {}

  static async getInstance() {
    // When running unit tests we need to recreate the instance
    if (!this.instance || process.env.NODE_ENV === "test") {
      this.instance = new SiteConfigService(SITES);
      SiteConfigService.resolvedHost = await getOriginalHost().then((host) => normalizeHost(host));
    }

    return this.instance;
  }

  requestHost(): SiteId {
    const ids = Object.keys(this.configById) as SiteId[];
    const match = ids.find((id) => {
      const siteHost = normalizeHost(this.configById[id].baseUrl);
      return SiteConfigService.resolvedHost === siteHost;
    });

    if (match) {
      return match;
    }

    if (process.env.PR_REVIEW === "true") {
      return "authStaging";
    }
    if (process.env.NODE_ENV === "development") {
      return "dev";
    }

    throw new Error(`No site configured for host: ${SiteConfigService.resolvedHost}`);
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

  getSiteLink(pageName: string): string {
    const { baseUrl } = this.resolve();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const pagePath = pageName.replace(/^\/+/, "");

    return `${baseUrl}${basePath}/${pagePath}`;
  }
}
