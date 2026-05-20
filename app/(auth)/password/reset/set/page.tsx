/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { checkSessionFactors, hasStrongMFA } from "@lib/server/route-protection";
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
  const session = await checkAuthenticationLevel(AuthLevel.BASIC_SESSION, requestId).then(
    (result) => {
      if (result.session === null) {
        throw new Error(
          "This should never throw but used as a type check in checkAuthenticationLevel"
        );
      }
      return result.session;
    }
  );

  const factors = checkSessionFactors(session);

  // Password reset recovery is intentionally gated by a verified strong factor,
  // but does not require a previously verified password.
  if (!factors.hasUser || !factors.notExpired || !hasStrongMFA(session ?? null)) {
    redirect("/password/reset/verify");
  }

  const passwordComplexitySettings = await getPasswordComplexitySettings();

  if (!session.factors?.user?.id || !passwordComplexitySettings) {
    redirect(buildUrlWithRequestId("/password/reset", requestId));
  }

  return (
    <AuthPanel
      titleI18nKey="reset.title"
      descriptionI18nKey="reset.description"
      namespace="password"
    >
      <PasswordReset
        userId={session.factors.user.id}
        loginName={session.factors.user.loginName}
        passwordComplexitySettings={passwordComplexitySettings}
      />
    </AuthPanel>
  );
}
