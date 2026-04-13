/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import * as Tooltip from "@radix-ui/react-tooltip";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSiteConfigFromHeaders } from "@lib/server/site-config";
import { getSiteLink } from "@lib/site-config";
import { serverTranslation } from "@i18n/server";
import { Logout } from "@components/auth/Logout";
import { VersionUpdater } from "@components/auth/VersionUpdater";
import { Footer } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { GcdsHeader } from "@components/layout/gcds-header/GcdsHeader";
import { SiteLink } from "@components/layout/site-header/SiteLink";
import { ToastContainer } from "@components/ui/toast/Toast";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const siteConfig = await getSiteConfigFromHeaders();
  const {
    i18n: { language },
  } = await serverTranslation(["fip"]);

  return (
    <div className="flex min-h-full flex-col bg-gray-soft">
      <GcdsHeader language={language}>
        <div className="inline-block">
          <Logout className="mr-2" />
        </div>
      </GcdsHeader>

      <div id="page-container" className="gc-authpages">
        <div className="account-wrapper mt-10 flex items-center justify-center">
          <div
            className={`rounded-2xl border-1 border-[#D1D5DB] bg-white p-10 tablet:w-164.5 has-[#auth-panel-wide]:tablet:w-237.5 laptop:w-212.5 has-[#auth-panel-wide]:laptop:w-[1200px]`}
          >
            <main id="content">
              <div className="mr-10 mb-6 inline-flex">
                <SiteLink href={getSiteLink(siteConfig, "home", language)} />
              </div>
              <Tooltip.Provider>{children}</Tooltip.Provider>
              <ToastContainer autoClose={false} containerId="default" />
            </main>
          </div>
        </div>
      </div>
      <VersionUpdater />
      <Footer>
        <FooterLinks siteConfig={siteConfig} />
      </Footer>
    </div>
  );
}
