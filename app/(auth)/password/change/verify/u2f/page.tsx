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
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { loadSessionById, loadSessionByLoginname } from "@lib/session";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginU2F } from "@components/mfa/LoginU2F";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("u2f");
  return { title: t("verify.title") };
}

export default async function Page() {
  let sessionId: string | undefined;
  let loginName: string | undefined;
  let organization: string | undefined;

  try {
    ({ sessionId, loginName, organization } = await getSessionCredentials());
  } catch {
    redirect("/password");
  }

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const authCheck = await checkAuthenticationLevel(
    serviceUrl,
    AuthLevel.PASSWORD_REQUIRED,
    loginName,
    organization
  );

  if (!authCheck.satisfied) {
    redirect(authCheck.redirect || "/password");
  }

  const sessionData = sessionId
    ? await loadSessionById(serviceUrl, sessionId, organization)
    : await loadSessionByLoginname(serviceUrl, loginName, organization);

  if (!sessionData.authMethods?.includes(AuthenticationMethodType.U2F)) {
    redirect("/password/change/verify");
  }

  return (
    <AuthPanel
      titleI18nKey="verify.title"
      descriptionI18nKey="none"
      namespace="u2f"
      imageSrc="/img/key-icon.png"
    >
      <UserAvatar
        loginName={loginName ?? sessionData.factors?.user?.loginName}
        displayName={sessionData.factors?.user?.displayName}
        showDropdown={false}
      />
      <div className="w-full">
        <LoginU2F
          loginName={loginName}
          sessionId={sessionId}
          organization={organization}
          login={false}
          redirect="/password/change"
        />
      </div>
    </AuthPanel>
  );
}
