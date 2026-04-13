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
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { loadMfaVerificationSession } from "@lib/server/mfa-verify";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { getSerializableObject } from "@lib/utils";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginOTP } from "@components/mfa/LoginOTP";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.authAppTitle") };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  const { sessionId, loginName, organization, sessionData } = await loadMfaVerificationSession({
    serviceUrl,
    pageName: "TOTP verify page",
    missingSessionRedirect: "/mfa/set/verify",
  });

  if (!sessionData.authMethods?.includes(AuthenticationMethodType.TOTP)) {
    redirect("/mfa/set/verify");
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
        redirect="/mfa/set"
        displayName={sessionData.factors?.user?.displayName}
        siteConfig={siteConfig}
      />
    </AuthPanel>
  );
}
