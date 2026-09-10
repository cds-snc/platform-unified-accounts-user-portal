/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Suspense } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { VersionUpdater } from "@components/auth/VersionUpdater";
import { YourAccount } from "@components/auth/YourAccount";
import { Footer, FooterSkeleton } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { SiteHeader, SiteHeaderSkeleton } from "@components/layout/site-header/SiteHeader";
import LanguageToggle from "@components/ui/language-toggle/LanguageToggle";
/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { NavMenu } from "@components/ui/nav-menu/NavMenu";

import { AccountNavigation } from "./components/AccountNavigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gray-soft">
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader>
          <NavMenu>
            <YourAccount />
            <LanguageToggle />
          </NavMenu>
        </SiteHeader>
      </Suspense>
      <main id="content" className="mx-auto max-w-285 px-6 py-2 laptop:px-0" tabIndex={-1}>
        <div className="mb-20 grid items-start gap-6 py-4 tablet:grid-cols-[22rem_1fr] tablet:gap-8">
          <aside className="w-full">
            <AccountNavigation />
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </main>
      {!isDev && <VersionUpdater />}
      <Suspense fallback={<FooterSkeleton />}>
        <Footer>
          <FooterLinks />
        </Footer>
      </Suspense>
    </div>
  );
}
