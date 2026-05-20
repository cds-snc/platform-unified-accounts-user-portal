/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel, hasStrongMFA } from "@lib/server/route-protection";
import { buildUrlWithRequestId } from "@lib/utils";
import { SearchParams } from "@lib/utils";
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

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;
  const session = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId).then(
    (result) => {
      if (result.session === null) {
        throw new Error(
          "This should never throw but used as a type check in checkAuthenticationLevel"
        );
      }
      return result.session;
    }
  );

  if (!hasStrongMFA(session)) {
    redirect(buildUrlWithRequestId("/password/change/verify", requestId));
  }

  const passwordComplexitySettings = await getPasswordComplexitySettings();
  const loginName = session.factors?.user?.loginName;

  if (!loginName || !passwordComplexitySettings) {
    logMessage.debug({
      message: "Password change page missing required session context",
      hasLoginName: !!loginName,

      hasPasswordComplexitySettings: !!passwordComplexitySettings,
    });
    throw new Error(
      "Missing Password Complexity Settings for Password Change page.  Check Zitadel configuration"
    );
  }

  return (
    <AuthPanel
      titleI18nKey="change.title"
      descriptionI18nKey="change.description"
      namespace="password"
    >
      <ChangePasswordForm
        sessionId={session.id}
        loginName={loginName}
        passwordComplexitySettings={passwordComplexitySettings}
      />
    </AuthPanel>
  );
}
