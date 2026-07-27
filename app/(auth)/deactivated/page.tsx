import type { Metadata } from "next";

import { TRUSTED_DOMAINS } from "@root/constants/site-config";
import { SiteConfigService } from "@lib/site-config";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LinkButton } from "@components/ui/button/LinkButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("deactivated");
  return { title: t("title") };
}

export default async function Page() {
  const { t, i18n } = await serverTranslation("deactivated");
  const locale = i18n.language ?? "en";

  const siteConfigService = await SiteConfigService.getInstance();
  const siteConfig = siteConfigService.resolve();
  const linkTemplate = TRUSTED_DOMAINS[siteConfig.id].links.support;
  const supportUrl =
    linkTemplate !== false
      ? linkTemplate.replaceAll("{baseUrl}", siteConfig.baseUrl).replaceAll("{locale}", locale)
      : false;

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="deactivated">
      {supportUrl !== false && (
        <LinkButton.Primary href={supportUrl}>{t("contactSupport")}</LinkButton.Primary>
      )}
    </AuthPanel>
  );
}
