/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import type { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { StrongFactorSelection } from "@components/mfa/StrongFactorSelection";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("mfa");
  return { title: t("verify.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;

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

  const canUseTotp = session.authMethods?.includes(AuthenticationMethodType.TOTP) ?? false;
  const canUseU2F = session.authMethods?.includes(AuthenticationMethodType.U2F) ?? false;

  if (session.factors?.user?.id || (!canUseTotp && !canUseU2F)) {
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
        requestId={requestId}
      />
    </AuthPanel>
  );
}
