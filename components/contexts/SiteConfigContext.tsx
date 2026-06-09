"use client";

import React, { createContext, ReactNode, useContext } from "react";

import { TRUSTED_DOMAINS } from "@root/constants/site-config";
import { SiteConfig, SiteLinkKey } from "@root/constants/site-config";
import { useTranslation } from "@i18n";

interface SiteConfigContextType {
  getSiteLink: <K extends SiteLinkKey>(linkKey: K) => string | false;
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

interface SiteConfigProviderProps {
  children: ReactNode;
  siteConfig: SiteConfig;
}

export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({ children, siteConfig }) => {
  const {
    i18n: { language: locale },
  } = useTranslation();

  function resolveSiteLinkTemplate(site: Pick<SiteConfig, "id" | "baseUrl">, linkKey: SiteLinkKey) {
    const links = TRUSTED_DOMAINS[site.id].links;
    return links[linkKey];
  }

  function getSiteLink<K extends SiteLinkKey>(linkKey: K): string | false {
    const linkTemplate = resolveSiteLinkTemplate(siteConfig, linkKey);

    if (linkTemplate === false) {
      return false;
    }

    return linkTemplate
      .replaceAll("{baseUrl}", siteConfig.baseUrl)
      .replaceAll("{locale}", locale ?? "en");
  }

  return (
    <SiteConfigContext.Provider value={{ getSiteLink }}>{children}</SiteConfigContext.Provider>
  );
};

export const useSiteConfig = (): SiteConfigContextType => {
  const context = useContext(SiteConfigContext);
  if (context === undefined) {
    throw new Error("useSiteConfig must be used within a SiteConfigProvider");
  }
  return context;
};
