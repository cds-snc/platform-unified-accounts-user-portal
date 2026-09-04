/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { buildUrlWithRequestId, type SearchParams } from "@lib/utils";
import { getPasswordComplexitySettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { PasswordReset } from "../components/PasswordReset";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("password");
  return { title: t("reset.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;
  await checkAuthenticationLevel(AuthLevel.ANY_MFA_REQUIRED_NO_PASSWORD, requestId);

  const passwordComplexitySettings = await getPasswordComplexitySettings();

  if (!passwordComplexitySettings) {
    logMessage.error("Could not retrieve password complexity settings from Zitadel");
    redirect(buildUrlWithRequestId("/password/reset", requestId));
  }

  return (
    <AuthPanel
      titleI18nKey="reset.title"
      descriptionI18nKey="reset.description"
      namespace="password"
    >
      <PasswordReset
        passwordComplexitySettings={passwordComplexitySettings}
        requestId={requestId}
      />
    </AuthPanel>
  );
}
