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
import { logMessage } from "@lib/logger";
import { loadMfaVerificationSession } from "@lib/server/mfa-verify";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";
import { StrongFactorSelection } from "@components/mfa/StrongFactorSelection";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("mfa");
  return { title: t("verify.title") };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { sessionData } = await loadMfaVerificationSession({
    serviceUrl,
    pageName: "MFA setup verify page",
    missingSessionRedirect: "/mfa/set",
  });

  const canUseTotp = sessionData.authMethods?.includes(AuthenticationMethodType.TOTP) ?? false;
  const canUseU2F = sessionData.authMethods?.includes(AuthenticationMethodType.U2F) ?? false;

  if (!sessionData.factors?.user?.id || (!canUseTotp && !canUseU2F)) {
    logMessage.info("MFA setup verification requires at least one configured strong MFA method");
    redirect("/mfa/set");
  }

  return (
    <AuthPanel titleI18nKey="verify.title" descriptionI18nKey="verify.description" namespace="mfa">
      <StrongFactorSelection
        canUseTotp={canUseTotp}
        canUseU2F={canUseU2F}
        totpUrl="/mfa/set/verify/time-based"
        u2fUrl="/mfa/set/verify/u2f"
      />
    </AuthPanel>
  );
}
