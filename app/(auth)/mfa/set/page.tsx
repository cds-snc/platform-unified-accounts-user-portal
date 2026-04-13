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
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { checkSessionFactorValidity, loadSessionById } from "@lib/session";
import { getSerializableLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { ChooseSecondFactorToSetup } from "../../u2f/set/components/ChooseSecondFactorToSetup";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("mfa");
  return { title: t("set.title") };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const { sessionId, loginName, organization, requestId } = await getSessionCredentials();

  const passwordAuthCheck = await checkAuthenticationLevel(
    serviceUrl,
    AuthLevel.PASSWORD_REQUIRED,
    loginName,
    organization
  );

  if (!passwordAuthCheck.satisfied) {
    logMessage.debug({
      message: "MFA set page auth check failed",
      reason: passwordAuthCheck.reason,
      redirect: passwordAuthCheck.redirect,
    });
    redirect(passwordAuthCheck.redirect || "/password");
  }

  const sessionFactors = await loadSessionById(serviceUrl, sessionId, organization);

  if (!sessionFactors) {
    logMessage.debug({
      message: "MFA set page missing session factors",
      hasSessionId: !!sessionId,
      hasOrganization: !!organization,
    });
    redirect("/");
  }

  const hasConfiguredStrongMFA = [AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F].some(
    (method) => sessionFactors.authMethods?.includes(method)
  );

  const hasVerifiedStrongMFA =
    !!sessionFactors.factors?.totp?.verifiedAt || !!sessionFactors.factors?.webAuthN?.verifiedAt;

  if (hasConfiguredStrongMFA && !hasVerifiedStrongMFA) {
    redirect("/mfa/set/verify");
  }

  const loginSettings = await getSerializableLoginSettings({
    serviceUrl,
    organizationId: sessionFactors.factors?.user?.organizationId,
  });

  const { valid } = checkSessionFactorValidity(sessionFactors);

  if (!valid || !sessionFactors.factors?.user?.id) {
    logMessage.debug({
      message: "MFA set page invalid session factors",
      valid,
      hasUserId: !!sessionFactors.factors?.user?.id,
    });
    redirect("/mfa");
  }

  return (
    <>
      <AuthPanel titleI18nKey="set.title" descriptionI18nKey="set.description" namespace="mfa">
        <div className="w-full">
          <div className="flex flex-col space-y-4">
            {valid && loginSettings && sessionFactors && sessionFactors.factors?.user?.id && (
              <ChooseSecondFactorToSetup checkAfter={true} requestId={requestId} />
            )}
          </div>
        </div>
      </AuthPanel>
    </>
  );
}
