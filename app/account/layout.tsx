/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { serverTranslation } from "@i18n/server";
import { Logout } from "@components/auth/Logout";
import { Footer } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { SiteHeader } from "@components/layout/site-header/SiteHeader";
import LanguageToggle from "@components/ui/language-toggle/LanguageToggle";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("account");
  return {
    title: {
      default: t("title"),
      // wraps any sub-page's title, so %s gets replaced with the page-specific string
      // Note: each sub page must update it's title e.g. ...generateMetadata()... return {title: "My Page Title"}..
      // TODO: this may need to be moved to a higher level when new sections are added
      template: `%s | ${t("title")}`,
    },
  };
}

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { NavMenu } from "@components/ui/nav-menu/NavMenu";

import { AccountNavigation } from "./components/AccountNavigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const _headers = await headers();
  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  return (
    <div className="min-h-screen bg-gray-soft">
      <SiteHeader>
        <NavMenu>
          <Logout />
          <LanguageToggle />
        </NavMenu>
      </SiteHeader>
      <main id="content" className="mx-auto max-w-[71.25rem] px-6 py-2 laptop:px-0" tabIndex={-1}>
        <div className="mb-20 grid items-start gap-6 py-4 tablet:grid-cols-[22rem_1fr] tablet:gap-8">
          <aside className="w-full">
            <AccountNavigation siteConfig={siteConfig} />
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </main>
      <Footer>
        <FooterLinks siteConfig={siteConfig} />
      </Footer>
    </div>
  );
}
