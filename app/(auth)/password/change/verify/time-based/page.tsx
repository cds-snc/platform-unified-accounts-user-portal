/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { LoginTOTP } from "@root/app/(auth)/otp/time-based/components/LoginTOTP";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { buildUrlWithRequestId, type SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.authAppTitle") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;

  const session = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId);

  if (session.authMethods?.includes(AuthenticationMethodType.TOTP)) {
    redirect(buildUrlWithRequestId("/password/change", requestId), "push");
  }

  return (
    <AuthPanel
      titleI18nKey="verify.authAppTitle"
      descriptionI18nKey="none"
      namespace="otp"
      imageSrc="/img/auth-app-icon.png"
    >
      <LoginTOTP
        loginName={session.factors?.user?.loginName}
        redirect="/password/change"
        requestId={requestId}
        displayName={session.factors?.user?.displayName}
      />
    </AuthPanel>
  );
}
