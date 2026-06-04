/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";

import { LoginTOTP } from "@root/app/(auth)/otp/time-based/components/LoginTOTP";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { SearchParams } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;
  const { factors, expirationDate } = await checkAuthenticationLevel(
    AuthLevel.PASSWORD_REQUIRED,
    requestId
  );

  const loginName = factors?.user?.loginName;

  // Extract just the session factors from the session data
  const sessionFactors = { factors, expirationDate };

  return (
    <AuthPanel
      titleI18nKey={"verify.authAppTitle"}
      descriptionI18nKey="none"
      namespace="otp"
      imageSrc={"/img/auth-app-icon.png"}
    >
      {sessionFactors && (
        <LoginTOTP
          loginName={loginName ?? sessionFactors.factors.user.loginName}
          requestId={requestId}
          displayName={sessionFactors.factors?.user?.displayName}
        />
      )}
    </AuthPanel>
  );
}
