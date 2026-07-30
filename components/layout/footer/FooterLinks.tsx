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
            <I18n i18nKey="about.desc" namespace="footer" />
          </a>
          <BulletPoint />
        </>
      )}
      {termsOfUseLink && (
        <>
          <a className="whitespace-nowrap" href={termsOfUseLink} target="_blank">
            <I18n i18nKey="terms-of-use.desc" namespace="footer" />
          </a>
          <BulletPoint />
        </>
      )}
      {slaLink && (
        <>
          <a className="whitespace-nowrap" href={slaLink} target="_blank">
            <I18n i18nKey="sla.desc" namespace="footer" />
          </a>
          <BulletPoint />
        </>
      )}
      <Link className="whitespace-nowrap" href="/contact-us">
        <I18n i18nKey="contact-us.desc" namespace="footer" />
      </Link>
    </span>
  );
};
