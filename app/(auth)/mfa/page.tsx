/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { buildUrlWithRequestId } from "@lib/utils";
import { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar/UserAvatar";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { ChooseSecondFactor } from "../u2f/components/ChooseSecondFactor";
// Strong MFA methods that must be configured before accessing the MFA selection page
const STRONG_MFA_METHODS = [AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("mfa");
  return { title: t("verify.title") };
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

  const sessionFactors = session.factors;

  // Check if user has at least one strong MFA method (TOTP or U2F)
  const hasStrongMFA = STRONG_MFA_METHODS.some((method) => session.authMethods?.includes(method));

  // Redirect to MFA setup if no strong MFA method is configured
  if (!hasStrongMFA) {
    redirect(buildUrlWithRequestId("/mfa/set", session.requestId));
  }

  return (
    <>
      <AuthPanel titleI18nKey="title" descriptionI18nKey="verify.description" namespace="mfa">
        <div className="flex flex-col space-y-4">
          <UserAvatar
            loginName={sessionFactors?.user?.loginName}
            displayName={sessionFactors?.user?.displayName}
            showDropdown={false}
          ></UserAvatar>
        </div>
        <ChooseSecondFactor
          userMethods={session.authMethods ?? []}
          loginName={sessionFactors?.user?.loginName}
          sessionId={session.id}
          requestId={session.requestId}
        />
      </AuthPanel>
    </>
  );
}
