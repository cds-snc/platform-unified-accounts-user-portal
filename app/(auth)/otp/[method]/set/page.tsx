/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type RegisterTOTPResponse } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ENABLE_EMAIL_OTP, LOGGED_IN_HOME_PAGE } from "@root/constants/config";
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { loadMfaSetupSession } from "@lib/server/mfa-setup";
import { protectedAddOTPEmail } from "@lib/server/zitadel-protected";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { buildUrlWithRequestId } from "@lib/utils";
import { registerTOTP } from "@lib/zitadel";
import { getZitadelUiError } from "@lib/zitadel-errors";
import { I18n } from "@i18n";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import * as Alert from "@components/ui/alert/Alert";
import { BackButton } from "@components/ui/button/BackButton";
import { Button } from "@components/ui/button/Button";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { TotpRegister } from "../components/TotpRegister";

export default async function Page(props: {
  searchParams: Promise<Record<string | number | symbol, string | undefined>>;
  params: Promise<Record<string | number | symbol, string | undefined>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  let sessionId: string | undefined;
  let loginName: string | undefined;
  let organization: string | undefined;
  let requestId: string | undefined;

  try {
    ({ sessionId, loginName, organization, requestId } = await getSessionCredentials());
  } catch {
    redirect("/password");
  }

  const checkAfter = searchParams.checkAfter === "true";

  const { method } = params;
  const { t } = await serverTranslation("otp");

  if (method === "email" && !ENABLE_EMAIL_OTP) {
    redirect(buildUrlWithRequestId("/mfa/set", requestId));
  }

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const session = await loadMfaSetupSession({
    serviceUrl,
    sessionId,
    loginName,
    organization,
    pageName: "OTP setup page",
    missingSessionRedirect: "/mfa/set",
  });

  let totpResponse: RegisterTOTPResponse | undefined,
    error: Error | undefined,
    mappedUiError: ReturnType<typeof getZitadelUiError>;
  if (session && session.factors?.user?.id) {
    const userId = session.factors.user.id;

    if (method === "time-based") {
      try {
        const resp = await registerTOTP({
          serviceUrl,
          userId,
        });

        if (resp) {
          totpResponse = resp;
        }
      } catch (err) {
        logMessage.debug({
          message: "Failed to register TOTP during OTP setup",
          error: err,
        });

        mappedUiError = getZitadelUiError("otp.set", err);

        error = err instanceof Error ? err : undefined;
      }
    } else if (method === "email") {
      const addOtpEmailResponse = await protectedAddOTPEmail(session.factors.user.id);
      if ("error" in addOtpEmailResponse && addOtpEmailResponse.error) {
        logMessage.debug({
          message: "Failed to enable OTP email during OTP setup",
          error: addOtpEmailResponse.error,
        });
      }
    } else {
      logMessage.debug({
        message: "Invalid OTP setup method",
        method,
      });
      redirect("/mfa/set");
    }
  } else {
    logMessage.debug({
      message: "OTP setup page missing session",
      method,
      hasLoginName: !!loginName,
      hasOrganization: !!organization,
    });
    redirect("/mfa/set");
  }

  let urlToContinue = buildUrlWithRequestId(LOGGED_IN_HOME_PAGE, requestId);

  if (checkAfter) {
    urlToContinue = `/otp/${method}?`;
  } else if (loginName) {
    urlToContinue = buildUrlWithRequestId(LOGGED_IN_HOME_PAGE, requestId);
  }

  const shouldBlockContinue = Boolean(error) && (!mappedUiError || mappedUiError.blockContinue);

  return (
    <>
      <AuthPanel titleI18nKey="set.title" descriptionI18nKey="none" namespace="otp">
        {totpResponse && "uri" in totpResponse && "secret" in totpResponse ? (
          <I18n
            i18nKey="set.totpRegisterDescription"
            namespace="otp"
            tagName="p"
            className="mb-6"
          />
        ) : null}

        {error && (
          <div className="py-4">
            <Alert.Warning
              body={mappedUiError ? t(mappedUiError.i18nKey) : t("set.genericError")}
            />
          </div>
        )}

        {session && (
          <UserAvatar
            loginName={loginName ?? session.factors?.user?.loginName}
            displayName={session.factors?.user?.displayName}
            showDropdown={false}
          ></UserAvatar>
        )}
      </AuthPanel>

      <div className="w-full">
        {totpResponse && "uri" in totpResponse && "secret" in totpResponse ? (
          <div>
            <TotpRegister
              uri={totpResponse.uri as string}
              secret={totpResponse.secret as string}
              loginName={loginName}
              organization={organization}
              requestId={requestId}
              checkAfter={checkAfter}
            ></TotpRegister>
          </div>
        ) : (
          <div className="mt-8 flex w-full flex-row items-center">
            <BackButton />
            <span className="grow"></span>

            {shouldBlockContinue ? (
              <Button disabled>
                <I18n i18nKey="set.submit" namespace="otp" />
              </Button>
            ) : (
              <Link href={urlToContinue}>
                <Button>
                  <I18n i18nKey="set.submit" namespace="otp" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
