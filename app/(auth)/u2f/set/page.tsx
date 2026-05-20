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
import { buildUrlWithRequestId } from "@lib/utils";
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
  const { checkAfter, requestId } = searchParams;

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
      message: "OTPsetup page requires strong MFA re-verification",
    });
    redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  if (!session.factors?.user?.loginName) {
    logMessage.debug({
      message: "U2F setup page missing required user context",
      hasLoginName: !!session.factors?.user?.loginName,
    });
    redirect(buildUrlWithRequestId("/mfa/set", requestId));
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
          loginName={session.factors.user.loginName}
          displayName={session.factors.user.displayName}
          showDropdown={false}
        ></UserAvatar>
      </div>

      <RegisterU2f
        sessionId={session.id}
        requestId={requestId}
        checkAfter={checkAfter === "true"}
      />
    </AuthPanel>
  );
}
