/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { VerifyEmailForm } from "./components/VerifyEmailForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("otp");
  return { title: t("verify.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;

  const { code, requestId } = searchParams;

  // TODO: Do we want to allow a user to verify their email in a different browser where they didn't
  // start their session.

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

  const _headers = await headers();

  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  if (!session.factors?.user?.id) {
    throw new Error("Used as a type guard to ensure user has id property");
  }

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="verify">
      <VerifyEmailForm
        loginName={session.factors?.user?.loginName}
        userId={session.factors.user.id}
        code={code}
        requestId={requestId}
        siteConfig={siteConfig}
      >
        <div className="my-8">
          <UserAvatar
            loginName={session.factors?.user?.loginName}
            displayName={session.factors?.user?.displayName}
            showDropdown={false}
          ></UserAvatar>
        </div>
      </VerifyEmailForm>
    </AuthPanel>
  );
}
