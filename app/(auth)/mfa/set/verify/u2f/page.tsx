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
import { loadMfaVerificationSession } from "@lib/server/mfa-verify";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar/UserAvatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginU2F } from "@components/mfa/LoginU2F";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("u2f");
  return { title: t("verify.title") };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { sessionId, loginName, organization, sessionData } = await loadMfaVerificationSession({
    serviceUrl,
    pageName: "U2F verify page",
    missingSessionRedirect: "/mfa/set/verify",
  });

  if (!sessionData.authMethods?.includes(AuthenticationMethodType.U2F)) {
    redirect("/mfa/set/verify");
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
          redirect="/mfa/set"
        />
      </div>
    </AuthPanel>
  );
}
