/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { getSafeRedirectUrl } from "@lib/utils/redirect-validator";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginU2F } from "@components/mfa/LoginU2F";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("u2f");
  return { title: t("verify.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { redirect: redirectParam, requestId } = searchParams;

  const safeRedirect = getSafeRedirectUrl(redirectParam);

  const session = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId);

  if (!session.factors?.user?.loginName || !session.factors?.user?.id) {
    logMessage.debug({
      message: "U2F verify page missing required user context",
      hasLoginName: !!session.factors?.user?.loginName,
      hasUserId: !!session.factors?.user?.id,
    });
    redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  return (
    <AuthPanel
      titleI18nKey="verify.title"
      descriptionI18nKey="none"
      namespace="u2f"
      imageSrc="/img/key-icon.png"
    >
      <UserAvatar
        loginName={session.factors.user.loginName}
        displayName={session.factors.user.displayName}
        showDropdown={false}
      ></UserAvatar>

      <div className="w-full">
        <LoginU2F requestId={requestId} redirect={safeRedirect} />
      </div>
    </AuthPanel>
  );
}
