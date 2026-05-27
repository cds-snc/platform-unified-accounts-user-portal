/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";

import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { SearchParams } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeRedirectUrl } from "@lib/utils/redirect-validator";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginTOTP } from "@components/mfa/LoginTOTP";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId, redirect } = searchParams;
  const {
    id: sessionId,
    factors,
    expirationDate,
  } = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId).then((result) => {
    if (result.session === null) {
      throw new Error(
        "This should never throw but used as a type check in checkAuthenticationLevel"
      );
    }
    return result.session;
  });

  const loginName = factors?.user?.loginName;

  // Extract just the session factors from the session data
  const sessionFactors = { factors, expirationDate };

  const safeRedirect = getSafeRedirectUrl(redirect);

  const loginSettings = await getLoginSettings();

  return (
    <AuthPanel
      titleI18nKey={"verify.authAppTitle"}
      descriptionI18nKey="none"
      namespace="otp"
      imageSrc={"/img/auth-app-icon.png"}
    >
      {sessionFactors && (
        <LoginTOTP
          loginName={loginName ?? sessionFactors.factors?.user?.loginName}
          sessionId={sessionId}
          requestId={requestId}
          loginSettings={loginSettings}
          redirect={safeRedirect}
          displayName={sessionFactors.factors?.user?.displayName}
        />
      )}
    </AuthPanel>
  );
}
