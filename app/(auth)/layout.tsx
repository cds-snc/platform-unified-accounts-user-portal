/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import * as Tooltip from "@radix-ui/react-tooltip";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSiteConfigFromHeaders } from "@lib/server/site-config";
import { I18n } from "@i18n";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { serverTranslation } from "@i18n/server";
import { Logout } from "@components/auth/Logout";
import { SiteLogo } from "@components/icons/SiteLogo";
import { Footer } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { GcdsHeader } from "@components/layout/gcds-header/GcdsHeader";
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
          <Logout className="mr-2 text-sm" />
        </div>
      </GcdsHeader>

      <div id="page-container" className="gc-authpages">
        <div className="account-wrapper mt-10 flex items-center justify-center">
          <div
            className={`rounded-2xl border-1 border-[#D1D5DB] bg-white p-10 tablet:w-[658px] has-[#auth-panel-wide]:tablet:w-[950px] laptop:w-[850px] has-[#auth-panel-wide]:laptop:w-[1200px]`}
          >
            <main id="content">
              <a
                className="mb-6 mr-10 inline-flex no-underline focus:bg-white"
                href={`${siteConfig.baseUrl}/${language}/about`}
              >
                <span className="">
                  <SiteLogo />
                </span>
                <span className="ml-3 inline-block text-[24px] font-semibold leading-10 text-[#1B00C2]">
                  <I18n i18nKey="title" namespace="common" />
                </span>
              </a>
              <Tooltip.Provider>{children}</Tooltip.Provider>
              <ToastContainer autoClose={false} containerId="default" />
            </main>
          </div>
        </div>
      </div>
      <Footer>
        <FooterLinks baseUrl={siteConfig.baseUrl} />
      </Footer>
    </div>
  );
}
