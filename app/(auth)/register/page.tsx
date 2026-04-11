/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { RegisterForm } from "./components/RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("register");
  return { title: t("title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;

  const resolvedHost = getOriginalHostFromHeaders(await headers());
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  const organization = ZITADEL_ORGANIZATION;

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
      <RegisterForm organization={organization} requestId={requestId} siteConfig={siteConfig} />
    </AuthPanel>
  );
}
