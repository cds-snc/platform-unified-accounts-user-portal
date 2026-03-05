"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSiteLink, SiteConfig } from "@lib/site-config";
import { I18n } from "@i18n";
import { useTranslation } from "@i18n/client";

const BulletPoint = () => {
  return <span className="px-3">&#x2022;</span>;
};

export const FooterLinks = ({ siteConfig }: { siteConfig: SiteConfig }) => {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return (
    <span className="mr-10 inline-block">
      <a
        className="whitespace-nowrap"
        href={getSiteLink(siteConfig, "about", locale)}
        target="_blank"
      >
        <I18n i18nKey="about.desc" namespace="footer" />
      </a>
      <BulletPoint />
      <a className="whitespace-nowrap" href={getSiteLink(siteConfig, "termsOfUse", locale)}>
        <I18n i18nKey="terms-of-use.desc" namespace="footer" />
      </a>
      <BulletPoint />
      <a className="whitespace-nowrap" href={getSiteLink(siteConfig, "sla", locale)}>
        <I18n i18nKey="sla.desc" namespace="footer" />
      </a>
    </span>
  );
};
