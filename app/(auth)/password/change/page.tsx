/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel, hasStrongMFA } from "@lib/server/route-protection";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { getPasswordComplexitySettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { ChangePasswordForm } from "./components/ChangePasswordForm";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("password");
  return { title: t("change.title") };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const { sessionId, loginName, organization } = await getSessionCredentials();

  // Page-level authentication check - defense in depth
  const authCheck = await checkAuthenticationLevel(
    serviceUrl,
    AuthLevel.PASSWORD_REQUIRED,
    loginName,
    organization
  );

  if (!authCheck.satisfied) {
    redirect(authCheck.redirect || "/password");
  }

  if (!hasStrongMFA(authCheck.session ?? null)) {
    redirect("/password/change/verify");
  }

  const passwordComplexitySettings = await getPasswordComplexitySettings({
    serviceUrl,
    organization,
  });

  if (!loginName || !sessionId || !organization || !passwordComplexitySettings) {
    logMessage.debug({
      message: "Password change page missing required session context",
      hasLoginName: !!loginName,
      hasSessionId: !!sessionId,
      hasOrganization: !!organization,
      hasPasswordComplexitySettings: !!passwordComplexitySettings,
    });
    redirect(authCheck.redirect || "/password");
  }

  return (
    <AuthPanel
      titleI18nKey="change.title"
      descriptionI18nKey="change.description"
      namespace="password"
    >
      <ChangePasswordForm
        sessionId={sessionId}
        loginName={loginName}
        organization={organization}
        passwordComplexitySettings={passwordComplexitySettings}
      />
    </AuthPanel>
  );
}
