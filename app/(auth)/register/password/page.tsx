/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { logMessage } from "@lib/logger";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { getPasswordComplexitySettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { PasswordPageClient } from "./PasswordPageClient";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("password");
  return { title: t("create.title") };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const organization = ZITADEL_ORGANIZATION;
  const passwordComplexitySettings = await getPasswordComplexitySettings({
    serviceUrl,
    organization,
  }).catch((_error) => {
    logMessage.warn("Failed to load password complexity settings for registration");
    return undefined;
  });

  if (!passwordComplexitySettings) {
    redirect("/register");
  }

  return (
    <AuthPanel
      titleI18nKey="password.title"
      descriptionI18nKey="password.description"
      namespace="register"
    >
      <PasswordPageClient passwordComplexitySettings={passwordComplexitySettings} />
    </AuthPanel>
  );
}
