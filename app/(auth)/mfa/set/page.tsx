/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { loadMfaSetupSession } from "@lib/server/mfa-setup";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { checkSessionFactorValidity } from "@lib/session";
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
  let sessionId: string | undefined;
  let loginName: string | undefined;
  let organization: string | undefined;
  let requestId: string | undefined;

  try {
    ({ sessionId, loginName, organization, requestId } = await getSessionCredentials());
  } catch {
    redirect("/password");
  }

  const sessionFactors = await loadMfaSetupSession({
    serviceUrl,
    sessionId,
    loginName,
    organization,
    pageName: "MFA set page",
    missingSessionRedirect: "/",
  });

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
