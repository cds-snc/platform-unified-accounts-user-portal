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
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";

import { RegisterU2f } from "./components/RegisterU2f";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("u2f");
  return { title: t("set.title") };
}

export default async function Page(props: {
  searchParams: Promise<Record<string | number | symbol, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const { checkAfter } = searchParams;

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
    pageName: "U2F setup page",
    missingSessionRedirect: "/mfa/set",
  });

  if (!loginName || !sessionFactors.id) {
    logMessage.debug({
      message: "U2F setup page missing required user context",
      hasLoginName: !!loginName,
      hasSessionFactorId: !!sessionFactors.id,
    });
    redirect("/mfa/set");
  }

  return (
    <AuthPanel
      titleI18nKey="set.title"
      descriptionI18nKey="none"
      namespace="u2f"
      imageSrc="/img/key-icon.png"
    >
      <div className="mb-6">
        <UserAvatar
          loginName={loginName ?? sessionFactors.factors?.user?.loginName}
          displayName={sessionFactors.factors?.user?.displayName}
          showDropdown={false}
        ></UserAvatar>
      </div>

      <RegisterU2f
        sessionId={sessionFactors.id}
        requestId={requestId}
        checkAfter={checkAfter === "true"}
      />
    </AuthPanel>
  );
}
