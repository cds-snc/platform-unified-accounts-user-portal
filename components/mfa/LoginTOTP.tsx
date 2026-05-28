"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import Link from "next/link";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";

import { FormState, handleOTPFormSubmit } from "@root/app/(auth)/otp/time-based/actions";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { I18n, useTranslation } from "@i18n";
import { UserAvatar } from "@components/account/user-avatar";
import { useSiteConfig } from "@components/contexts/SiteConfigContext";
import { BackButton } from "@components/ui/button/BackButton";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";
import { CodeEntry } from "@components/ui/form/CodeEntry";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

export function LoginTOTP({
  loginName,
  sessionId,
  requestId,
  loginSettings,
  redirect,
  displayName,
}: {
  loginName?: string;
  sessionId?: string;
  requestId?: string;
  loginSettings?: LoginSettings;
  redirect?: string | null;
  displayName?: string;
}) {
  const { t } = useTranslation("otp");
  const { getSiteLink } = useSiteConfig();
  const supportLink = getSiteLink("support");

  const genericErrorMessage = t("set.genericError");
  const invalidCodeMessage = t("set.invalidCode");
  const invalidCodeLengthMessage = t("set.invalidCodeLength");

  const localFormAction = async (_: FormState, formData?: FormData) => {
    const enteredCode = (formData?.get("code") as string) ?? "";
    const result = await handleOTPFormSubmit(enteredCode, {
      loginName,
      sessionId,
      requestId,
      loginSettings,
      redirect,
    });

    return result;
  };

  const [state, formAction, isPending] = useActionState(localFormAction, {
    validationErrors: undefined,
    error: undefined,
    formData: {
      code: "",
    },
  });

  return (
    <>
      {!isPending && state.error && (
        <div className="py-4" data-testid="error">
          <Alert type={ErrorStatus.ERROR} focussable>
            {getSafeErrorMessage({
              error: state.error,
              fallback: genericErrorMessage,
              allowedMessages: [genericErrorMessage, invalidCodeMessage, invalidCodeLengthMessage],
            })}
          </Alert>
        </div>
      )}

      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />

      <UserAvatar loginName={loginName} displayName={displayName} showDropdown={false} />

      <div className="w-full">
        <form id="totp" action={formAction} noValidate>
          <CodeEntry state={state} code={""} className="mt-8" />
          <div className="mt-6 flex items-center gap-4">
            <BackButton />
            <SubmitButtonAction>
              <I18n i18nKey="submit" namespace="verify" />
            </SubmitButtonAction>
          </div>
        </form>

        <div className="mt-8 flex items-center gap-4">
          {supportLink && (
            <Link href={supportLink}>
              <I18n i18nKey="help" namespace="verify" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
