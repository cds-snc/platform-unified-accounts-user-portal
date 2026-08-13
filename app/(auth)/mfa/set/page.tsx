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
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
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
  const session = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId, {
    requireEmailVerified: true,
  });

  if (requiresStrongMfaSetupVerification(session)) {
    logMessage.debug({
      message: "MFA setup page requires strong MFA re-verification",
    });
    redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  return (
    <>
      <AuthPanel titleI18nKey="set.title" descriptionI18nKey="set.description" namespace="mfa">
        <div className="w-full">
          <div className="flex flex-col space-y-4">
            <ChooseSecondFactorToSetup checkAfter={true} requestId={requestId} />
          </div>
        </div>
      </AuthPanel>
    </>
  );
}
