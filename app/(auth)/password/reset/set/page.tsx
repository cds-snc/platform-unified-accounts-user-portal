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
import { checkSessionFactors, hasStrongMFA } from "@lib/server/route-protection";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { loadMostRecentSession } from "@lib/session";
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

export default async function Page() {
  let loginName: string | undefined;
  let organization: string | undefined;

  try {
    ({ loginName, organization } = await getSessionCredentials());
  } catch {
    redirect("/password/reset");
  }

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const session = await loadMostRecentSession({
    serviceUrl,
    sessionParams: { loginName, organization },
  }).catch(() => undefined);

  const factors = checkSessionFactors(session ?? null);

  // Password reset recovery is intentionally gated by a verified strong factor,
  // but does not require a previously verified password.
  if (!factors.hasUser || !factors.notExpired || !hasStrongMFA(session ?? null)) {
    redirect("/password/reset/verify");
  }

  const passwordComplexitySettings = await getPasswordComplexitySettings({
    serviceUrl,
    organization: organization ?? session?.factors?.user?.organizationId,
  });

  if (!session?.factors?.user?.id || !passwordComplexitySettings) {
    redirect("/password/reset");
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
        organization={organization ?? session.factors.user.organizationId}
        passwordComplexitySettings={passwordComplexitySettings}
      />
    </AuthPanel>
  );
}
