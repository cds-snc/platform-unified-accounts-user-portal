/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { dir } from "i18next";

import { AppStatusProvider } from "@lib/client/useAppStatus";
import { SiteConfigService } from "@lib/site-config";
import { serverTranslation } from "@i18n/server";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { languages } from "@i18n/settings";
import { SiteConfigProvider } from "@components/contexts/SiteConfigContext";
import RouterDebugger from "@components/debugging/RouterDebugger";
import { DocumentShell } from "@components/layout/DocumentShell";
import ServiceWorker from "@components/layout/ServiceWorker";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("common");
  return { title: t("title") };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [requestCookies, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = requestCookies.get("i18next")?.value ?? languages[0];
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const isDev = process.env.NODE_ENV === "development";
  const siteConfig = await SiteConfigService.getInstance();

  return (
    <DocumentShell locale={locale} direction={dir(locale)} iconFontNonce={nonce} includeIconFont>
      {!isDev && <ServiceWorker />}
      {process.env.DEBUG && <RouterDebugger />}
      <SiteConfigProvider siteConfig={siteConfig.resolve()}>
        <AppStatusProvider>{children}</AppStatusProvider>
      </SiteConfigProvider>
    </DocumentShell>
  );
}
