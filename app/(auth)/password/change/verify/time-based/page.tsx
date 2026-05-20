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
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { resolveSiteConfigByHost } from "@lib/site-config";
import type { SearchParams } from "@lib/utils";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginTOTP } from "@components/mfa/LoginTOTP";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.authAppTitle") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const [{ requestId }, _headers] = await Promise.all([props.searchParams, headers()]);

  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

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

  if (session.authMethods?.includes(AuthenticationMethodType.TOTP)) {
    redirect("/password/change/verify");
  }

  const loginSettings = await getLoginSettings();

  return (
    <AuthPanel
      titleI18nKey="verify.authAppTitle"
      descriptionI18nKey="none"
      namespace="otp"
      imageSrc="/img/auth-app-icon.png"
    >
      <LoginTOTP
        loginName={session.factors?.user?.loginName}
        sessionId={session.id}
        loginSettings={loginSettings}
        redirect="/password/change"
        displayName={session.factors?.user?.displayName}
        siteConfig={siteConfig}
      />
    </AuthPanel>
  );
}
