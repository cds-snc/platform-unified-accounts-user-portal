/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { loadSessionById, loadSessionByLoginname } from "@lib/session";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { StrongFactorSelection } from "@components/mfa/StrongFactorSelection";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("mfa");
  return { title: t("verify.title") };
}

export default async function Page() {
  let sessionId: string | undefined;
  let loginName: string | undefined;
  let organization: string | undefined;

  try {
    ({ sessionId, loginName, organization } = await getSessionCredentials());
  } catch {
    redirect("/password");
  }

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const authCheck = await checkAuthenticationLevel(
    serviceUrl,
    AuthLevel.PASSWORD_REQUIRED,
    loginName,
    organization
  );

  if (!authCheck.satisfied) {
    redirect(authCheck.redirect || "/password");
  }

  const sessionData = sessionId
    ? await loadSessionById(serviceUrl, sessionId, organization)
    : await loadSessionByLoginname(serviceUrl, loginName, organization);

  const canUseTotp = sessionData.authMethods?.includes(AuthenticationMethodType.TOTP) ?? false;
  const canUseU2F = sessionData.authMethods?.includes(AuthenticationMethodType.U2F) ?? false;

  if (!sessionData.factors?.user?.id || (!canUseTotp && !canUseU2F)) {
    logMessage.info("Password change requires at least one configured strong MFA method");
    redirect("/account");
  }

  return (
    <AuthPanel titleI18nKey="verify.title" descriptionI18nKey="verify.description" namespace="mfa">
      <StrongFactorSelection
        canUseTotp={canUseTotp}
        canUseU2F={canUseU2F}
        totpUrl="/password/change/verify/time-based"
        u2fUrl="/password/change/verify/u2f"
      />
    </AuthPanel>
  );
}
