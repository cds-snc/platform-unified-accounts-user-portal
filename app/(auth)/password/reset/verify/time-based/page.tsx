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
import { buildUrlWithRequestId, getSerializableObject } from "@lib/utils";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginTOTP } from "@components/mfa/LoginTOTP";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.authAppTitle") };
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

  const _headers = await headers();
  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  if (!session.authMethods?.includes(AuthenticationMethodType.TOTP)) {
    redirect(buildUrlWithRequestId("/password/reset/verify", requestId));
  }

  const loginSettings = await getLoginSettings().then((obj) => getSerializableObject(obj));

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
        redirect="/password/reset/set"
        displayName={session.factors?.user?.displayName}
        siteConfig={siteConfig}
      />
    </AuthPanel>
  );
}
