/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import {
  AuthLevel,
  checkAuthenticationLevel,
  requiresStrongMfaSetupVerification,
} from "@lib/server/route-protection";
import { checkSessionFactorValidity } from "@lib/session";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { getLoginSettings } from "@lib/zitadel";
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

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;
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

  if (requiresStrongMfaSetupVerification(session)) {
    logMessage.debug({
      message: "MFA setup page requires strong MFA re-verification",
    });
    redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  const loginSettings = await getLoginSettings();

  const { valid } = checkSessionFactorValidity(session);

  if (!valid || !session.factors?.user?.id) {
    logMessage.debug({
      message: "MFA set page invalid session factors",
      valid,
      hasUserId: !!session.factors?.user?.id,
    });
    redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  return (
    <>
      <AuthPanel titleI18nKey="set.title" descriptionI18nKey="set.description" namespace="mfa">
        <div className="w-full">
          <div className="flex flex-col space-y-4">
            {valid && loginSettings && session.factors?.user?.id && (
              <ChooseSecondFactorToSetup checkAfter={true} requestId={requestId} />
            )}
          </div>
        </div>
      </AuthPanel>
    </>
  );
}
