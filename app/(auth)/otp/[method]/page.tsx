/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ENABLE_EMAIL_OTP } from "@root/constants/config";
import { getSessionCredentials } from "@lib/cookies";
import { getSafeRedirectUrl } from "@lib/redirect-validator";
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { loadSessionById, loadSessionByLoginname } from "@lib/session";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { buildUrlWithRequestId } from "@lib/utils";
import { getSerializableObject, SearchParams } from "@lib/utils";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginOTP } from "@components/mfa/LoginOTP";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.title") };
}

export default async function Page(props: {
  searchParams: Promise<SearchParams>;
  params: Promise<Record<string | number | symbol, string | undefined>>;
}) {
  const [params, searchParams, _headers, { sessionId, loginName, organization, requestId }] =
    await Promise.all([props.params, props.searchParams, headers(), getSessionCredentials()]);

  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  const { code, redirect: redirectParam } = searchParams;

  // Method =  `/otp/email` or `/otp/time-based` (authenticator app)
  const { method } = params;

  if (method === "email" && !ENABLE_EMAIL_OTP) {
    return redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  const sessionData = sessionId
    ? await loadSessionById(serviceUrl, sessionId, organization)
    : await loadSessionByLoginname(serviceUrl, loginName, organization);

  // Extract just the session factors from the session data
  const sessionFactors = sessionData
    ? { factors: sessionData.factors, expirationDate: sessionData.expirationDate }
    : undefined;

  const safeRedirect = getSafeRedirectUrl(redirectParam);

  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization: organization ?? sessionFactors?.factors?.user?.organizationId,
  }).then((obj) => getSerializableObject(obj));

  return (
    <AuthPanel
      titleI18nKey={method === "time-based" ? "verify.authAppTitle" : "verify.title"}
      descriptionI18nKey="none"
      namespace="otp"
      imageSrc={method === "time-based" ? "/img/auth-app-icon.png" : undefined}
    >
      {method && sessionFactors && (
        <LoginOTP
          loginName={loginName ?? sessionFactors.factors?.user?.loginName}
          sessionId={sessionId}
          organization={organization ?? sessionFactors?.factors?.user?.organizationId}
          requestId={requestId}
          method={method}
          loginSettings={loginSettings}
          code={code}
          redirect={safeRedirect}
          displayName={sessionFactors.factors?.user?.displayName}
          siteConfig={siteConfig}
        />
      )}
    </AuthPanel>
  );
}
