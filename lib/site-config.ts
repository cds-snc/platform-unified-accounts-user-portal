/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import siteLinksByProductJson from "@root/constants/site-links.json";

export type SiteId = "forms_dev" | "forms_staging" | "forms_production";
export type ProductId = "gcforms";

export type SiteConfig = {
  id: SiteId;
  productId: ProductId;
  baseUrl: string;
  zitadelOrganizationId: string;
};

export type SiteLinkKey = "about" | "termsOfUse" | "sla" | "support";

type SiteLinkTemplates = Record<SiteLinkKey, string>;

type ProductLinksConfig = {
  defaults: SiteLinkTemplates;
  overrides?: Partial<Record<SiteId, Partial<SiteLinkTemplates>>>;
};

type SiteLinksByProductId = Record<ProductId, ProductLinksConfig>;

const SITE_LINKS_BY_PRODUCT_ID: SiteLinksByProductId =
  siteLinksByProductJson as SiteLinksByProductId;

const SITE_CONFIG_BY_ID: Record<SiteId, Pick<SiteConfig, "productId" | "baseUrl">> = {
  forms_dev: {
    productId: "gcforms",
    baseUrl: "http://localhost:3000",
  },
  forms_staging: {
    productId: "gcforms",
    baseUrl: "https://forms-staging.cdssandbox.xyz",
  },
  forms_production: {
    productId: "gcforms",
    baseUrl: "https://forms-formulaires.alpha.canada.ca",
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

  private constructor(
    private readonly configById: Record<SiteId, Pick<SiteConfig, "productId" | "baseUrl">>
  ) {}

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
      productId: defaults.productId,
      baseUrl: defaults.baseUrl,
      zitadelOrganizationId: ZITADEL_ORGANIZATION,
    };
  }
}

export const siteConfig = SiteConfigService.getInstance();

export const requestHost = (host: string): SiteId => siteConfig.requestHost(host);

export const resolveSiteConfigByHost = (rawHost: string): SiteConfig => siteConfig.resolve(rawHost);

export const getSiteLinksByProductId = (productId: ProductId) => {
  return SITE_LINKS_BY_PRODUCT_ID[productId];
};

export const getSiteLink = (
  site: Pick<SiteConfig, "id" | "productId" | "baseUrl">,
  linkKey: SiteLinkKey,
  locale: string
) => {
  const links = getSiteLinksByProductId(site.productId);
  const overrideTemplate = links.overrides?.[site.id]?.[linkKey];
  const linkTemplate = overrideTemplate || links.defaults[linkKey];
  const resolvedLocale = locale || "en";

  return linkTemplate.replaceAll("{baseUrl}", site.baseUrl).replaceAll("{locale}", resolvedLocale);
};
