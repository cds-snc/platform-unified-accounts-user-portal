/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import * as Tooltip from "@radix-ui/react-tooltip";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { serverTranslation } from "@i18n/server";
import { Logout } from "@components/auth/Logout";
import { Footer } from "@components/layout/footer/Footer";
import { FooterLinks } from "@components/layout/footer/FooterLinks";
import { GcdsHeader } from "@components/layout/gcds-header/GcdsHeader";
import { SiteLink } from "@components/layout/site-header/SiteLink";
import { ToastContainer } from "@components/ui/toast/Toast";
const FORMS_PRODUCTION_URL = process.env.NEXT_PUBLIC_FORMS_PRODUCTION_URL || "";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
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
              <div className="mb-6 mr-10 inline-flex">
                <SiteLink href={`${FORMS_PRODUCTION_URL}`} />
              </div>
              <Tooltip.Provider>{children}</Tooltip.Provider>
              <ToastContainer autoClose={false} containerId="default" />
            </main>
          </div>
        </div>
      </div>
      <Footer>
        <FooterLinks />
      </Footer>
    </div>
  );
}
