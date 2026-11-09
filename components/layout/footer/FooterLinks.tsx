"use client";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import Link from "next/link";

import { I18n } from "@i18n";
import { useSiteConfig } from "@components/contexts/SiteConfigContext";

const BulletPoint = () => {
  return <span className="px-3">&#x2022;</span>;
};

export const FooterLinks = () => {
  const { getSiteLink } = useSiteConfig();

  const aboutLink = getSiteLink("about");
  const termsOfUseLink = getSiteLink("termsOfUse");
  const slaLink = getSiteLink("sla");

  return (
    <span className="mr-10 inline-block">
      {aboutLink && (
        <>
          <a className="whitespace-nowrap" href={aboutLink} target="_blank">
            <I18n i18nKey="footer:about.desc" />
          </a>
          <BulletPoint />
        </>
      )}
      {termsOfUseLink && (
        <>
          <a className="whitespace-nowrap" href={termsOfUseLink} target="_blank">
            <I18n i18nKey="footer:terms-of-use.desc" />
          </a>
          <BulletPoint />
        </>
      )}
      {slaLink && (
        <>
          <a className="whitespace-nowrap" href={slaLink} target="_blank">
            <I18n i18nKey="footer:sla.desc" />
          </a>
          <BulletPoint />
        </>
      )}
      <Link className="whitespace-nowrap" href="/privacy-policy">
        <I18n i18nKey="footer:privacy-policy.desc" />
      </Link>
      <BulletPoint />
      <Link className="whitespace-nowrap" href="/contact-us">
        <I18n i18nKey="footer:contact-us.desc" />
      </Link>
    </span>
  );
};
