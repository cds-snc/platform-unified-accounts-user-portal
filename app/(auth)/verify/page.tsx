/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HumanUser, User } from "@zitadel/proto/zitadel/user/v2/user_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { loadMostRecentSession } from "@lib/session";
import { resolveSiteConfigByHost } from "@lib/site-config";
import { SearchParams } from "@lib/utils";
import { getUserByID } from "@lib/zitadel";
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

  const { userId, loginName, code, organization, requestId } = searchParams;

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const resolvedHost = getOriginalHostFromHeaders(_headers);
  const siteConfig = resolveSiteConfigByHost(resolvedHost);

  let sessionFactors;
  let user: User | undefined;
  let human: HumanUser | undefined;

  if ("loginName" in searchParams) {
    sessionFactors = await loadMostRecentSession({
      serviceUrl,
      sessionParams: {
        loginName,
        organization,
      },
    });
  } else if ("userId" in searchParams && userId) {
    const userResponse = await getUserByID({
      serviceUrl,
      userId,
    });
    if (userResponse) {
      user = userResponse.user;
      if (user?.type.case === "human") {
        human = user.type.value as HumanUser;
      }
    }
  }

  const id = userId ?? sessionFactors?.factors?.user?.id;

  if (!id) {
    redirect("/");
  }

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="verify">
      <VerifyEmailForm
        loginName={loginName}
        organization={organization}
        userId={id}
        code={code}
        requestId={requestId}
        siteConfig={siteConfig}
      >
        <div className="my-8">
          {sessionFactors ? (
            <UserAvatar
              loginName={loginName ?? sessionFactors.factors?.user?.loginName}
              displayName={sessionFactors.factors?.user?.displayName}
              showDropdown={false}
            ></UserAvatar>
          ) : (
            user && (
              <UserAvatar
                loginName={user.preferredLoginName}
                displayName={human?.profile?.displayName}
                showDropdown={false}
              />
            )
          )}
        </div>
      </VerifyEmailForm>
    </AuthPanel>
  );
}
