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
import type { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LoginU2F } from "@components/mfa/LoginU2F";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("u2f");
  return { title: t("verify.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;
  const session = await checkAuthenticationLevel(AuthLevel.BASIC_SESSION, requestId).then(
    (result) => {
      if (result.session === null) {
        throw new Error(
          "This should never throw but used as a type check in checkAuthenticationLevel"
        );
      }
      return result.session;
    }
  );

  if (!session.authMethods?.includes(AuthenticationMethodType.U2F)) {
    redirect("/password/reset/verify");
  }

  return (
    <AuthPanel
      titleI18nKey="verify.title"
      descriptionI18nKey="none"
      namespace="u2f"
      imageSrc="/img/key-icon.png"
    >
      <UserAvatar
        loginName={session.factors?.user?.loginName}
        displayName={session.factors?.user?.displayName}
        showDropdown={false}
      />
      <div className="w-full">
        <LoginU2F
          loginName={session.factors?.user?.loginName}
          sessionId={session.id}
          login={false}
          redirect="/password/reset/set"
          requestId={requestId}
        />
      </div>
    </AuthPanel>
  );
}
