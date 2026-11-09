/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Suspense } from "react";

import { YourAccount } from "@components/auth/YourAccount";
import { Footer, FooterSkeleton } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { SiteHeader, SiteHeaderSkeleton } from "@components/layout/site-header/SiteHeader";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import LanguageToggle from "@components/ui/language-toggle/LanguageToggle";
/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { NavMenu } from "@components/ui/nav-menu/NavMenu";

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-soft">
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader>
          <NavMenu>
            <YourAccount />
            <LanguageToggle />
          </NavMenu>
        </SiteHeader>
      </Suspense>
      <main
        id="content"
        className="mx-auto w-full max-w-285 flex-1 px-6 py-2 laptop:px-0"
        tabIndex={-1}
        aria-labelledby="page-heading"
      >
        {children}
      </main>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer>
          <FooterLinks />
        </Footer>
      </Suspense>
    </div>
  );
}
