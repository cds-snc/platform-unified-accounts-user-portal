/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import Link from "next/link";
import { redirect } from "next/navigation";
import { type RegisterTOTPResponse } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { LOGGED_IN_HOME_PAGE } from "@root/constants/config";
import { logMessage } from "@lib/logger";
import {
  AuthLevel,
  checkAuthenticationLevel,
  requiresStrongMfaSetupVerification,
} from "@lib/server/route-protection";
import { buildUrlWithRequestId } from "@lib/utils";
import { registerTOTP } from "@lib/zitadel";
import { getZitadelUiError } from "@lib/zitadel-errors";
import { I18n } from "@i18n";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { Alert } from "@components/ui/alert/Alert";
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

  if (requiresStrongMfaSetupVerification(session)) {
    logMessage.debug({
      message: "OTPsetup page requires strong MFA re-verification",
    });
    redirect(buildUrlWithRequestId("/mfa", requestId));
  }

  const loginName = session.factors?.user?.loginName;
  const displayName = session.factors?.user?.displayName;

  const checkAfter = searchParams.checkAfter === "true";

  const { method } = params;
  const { t } = await serverTranslation("otp");

  let totpResponse: RegisterTOTPResponse | undefined,
    error: Error | undefined,
    mappedUiError: ReturnType<typeof getZitadelUiError>;
  if (session.factors?.user?.id) {
    const userId = session.factors.user.id;

    try {
      const resp = await registerTOTP({
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
  } else {
    logMessage.debug({
      message: "OTP setup page missing session",
      method,
      hasLoginName: !!loginName,
    });
    redirect(buildUrlWithRequestId("/", requestId));
  }

  let urlToContinue = buildUrlWithRequestId(LOGGED_IN_HOME_PAGE, requestId);

  if (checkAfter) {
    urlToContinue = buildUrlWithRequestId(`/otp/${method}`, requestId);
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

        <UserAvatar
          loginName={loginName}
          displayName={displayName}
          showDropdown={false}
        ></UserAvatar>
      </AuthPanel>

      <div className="w-full">
        {totpResponse && "uri" in totpResponse && "secret" in totpResponse ? (
          <div>
            <TotpRegister
              uri={totpResponse.uri as string}
              secret={totpResponse.secret as string}
              loginName={loginName}
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
