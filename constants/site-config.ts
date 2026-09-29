export type SiteId = "dev" | "authStaging" | "authProduction" | "formsStaging" | "formsProduction";
export type SiteConfig = {
  id: SiteId;
  baseUrl: string;
  zitadelOrganizationId: string;
};

export type SiteLinkKey = "about" | "termsOfUse" | "sla" | "support" | "gcForms";

// Use URL templates with {baseUrl} and optional {locale}; set false to hide a link.
type SiteLinkValue = string | false;
type SiteLinksConfig = Record<SiteLinkKey, SiteLinkValue>;

export type TrustedDomainConfig = Pick<SiteConfig, "baseUrl"> & {
  links: SiteLinksConfig;
};

const createLinks = (overrides: Partial<SiteLinksConfig> = {}): SiteLinksConfig => ({
  about: false,
  termsOfUse: false,
  sla: false,
  support: false,
  gcForms: "https://forms-staging.cdssandbox.xyz/{locale}/forms",
  ...overrides,
});

export const TRUSTED_DOMAINS: Record<SiteId, TrustedDomainConfig> = {
  dev: {
    baseUrl: "http://localhost:3000",
    links: createLinks(),
  },
  authStaging: {
    baseUrl: "https://auth.cdssandbox.xyz",
    links: createLinks(),
  },
  authProduction: {
    baseUrl: "https://session.canada.ca",
    links: createLinks({
      gcForms: "https://forms-formulaires.alpha.canada.ca/{locale}/forms",
    }),
  },
  formsStaging: {
    baseUrl: "https://forms-staging.cdssandbox.xyz",
    links: createLinks(),
  },
  formsProduction: {
    baseUrl: "https://forms-formulaires.alpha.canada.ca",
    links: createLinks(),
  },
};
