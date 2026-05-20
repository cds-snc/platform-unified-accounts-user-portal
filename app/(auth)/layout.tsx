/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Suspense } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

import { VersionUpdater } from "@components/auth/VersionUpdater";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { YourAccount } from "@components/auth/YourAccount";
import { Footer, FooterSkeleton } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { GcdsHeader, GcdsHeaderSkeleton } from "@components/layout/gcds-header/GcdsHeader";
import { SiteLink } from "@components/layout/site-header/SiteLink";
import LanguageToggle from "@components/ui/language-toggle/LanguageToggle";
import { NavMenu } from "@components/ui/nav-menu/NavMenu";
import { ToastContainer } from "@components/ui/toast/Toast";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-full flex-col bg-gray-soft">
      <Suspense fallback={<GcdsHeaderSkeleton />}>
        <GcdsHeader>
          <NavMenu>
            <YourAccount />
            <LanguageToggle />
          </NavMenu>
        </GcdsHeader>
      </Suspense>
      <div id="page-container" className="gc-authpages">
        <div className="account-wrapper mt-10 flex items-center justify-center">
          <div
            className={`rounded-2xl border-1 border-[#D1D5DB] bg-white p-10 tablet:w-164.5 has-[#auth-panel-wide]:tablet:w-237.5 laptop:w-212.5 has-[#auth-panel-wide]:laptop:w-[1200px]`}
          >
            <main id="content" tabIndex={-1}>
              <div className="mr-10 mb-6 inline-flex">
                <SiteLink href="/" />
              </div>
              <Tooltip.Provider>{children}</Tooltip.Provider>
              <ToastContainer autoClose={false} containerId="default" />
            </main>
          </div>
        </div>
      </div>
      {!isDev && <VersionUpdater />}
      <Suspense fallback={<FooterSkeleton />}>
        <Footer>
          <FooterLinks />
        </Footer>
      </Suspense>
    </div>
  );
}
