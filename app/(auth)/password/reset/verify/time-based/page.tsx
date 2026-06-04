/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
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
  const session = await checkAuthenticationLevel(AuthLevel.BASIC_SESSION, requestId);

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
        loginSettings={loginSettings}
        redirect="/password/reset/set"
        displayName={session.factors?.user?.displayName}
      />
    </AuthPanel>
  );
}
