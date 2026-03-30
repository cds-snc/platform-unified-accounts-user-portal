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
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { loadSessionById, loadSessionByLoginname } from "@lib/session";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { getSerializableObject } from "@lib/utils";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { LoginOTP } from "../../../../otp/[method]/components/LoginOTP";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.authAppTitle") };
}

export default async function Page() {
  let sessionId: string | undefined;
  let loginName: string | undefined;
  let organization: string | undefined;

  try {
    ({ sessionId, loginName, organization } = await getSessionCredentials());
  } catch {
    redirect("/password/reset");
  }

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  const sessionData = sessionId
    ? await loadSessionById(serviceUrl, sessionId, organization)
    : await loadSessionByLoginname(serviceUrl, loginName, organization);

  if (!sessionData.authMethods?.includes(AuthenticationMethodType.TOTP)) {
    redirect("/password/reset/verify");
  }

  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization: organization ?? sessionData.factors?.user?.organizationId,
  }).then((obj) => getSerializableObject(obj));

  return (
    <AuthPanel
      titleI18nKey="verify.authAppTitle"
      descriptionI18nKey="none"
      namespace="otp"
      imageSrc="/img/auth-app-icon.png"
    >
      <LoginOTP
        loginName={loginName ?? sessionData.factors?.user?.loginName}
        sessionId={sessionId}
        organization={organization ?? sessionData.factors?.user?.organizationId}
        method="time-based"
        loginSettings={loginSettings}
        redirect="/password/reset/set"
        displayName={sessionData.factors?.user?.displayName}
        siteConfig={siteConfig}
      />
    </AuthPanel>
  );
}
