"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";

import { FormState, handleOTPFormSubmit } from "@root/app/(auth)/otp/time-based/actions";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { getSiteLink, SiteConfig } from "@lib/site-config";
import { I18n, useTranslation } from "@i18n";
import { UserAvatar } from "@components/account/user-avatar";
import { BackButton } from "@components/ui/button/BackButton";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";
import { CodeEntry } from "@components/ui/form/CodeEntry";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

export function LoginTOTP({
  loginName,
  sessionId,
  requestId,
  organization,
  siteConfig,
  loginSettings,
  redirect,
  displayName,
}: {
  loginName?: string;
  sessionId?: string;
  requestId?: string;
  organization?: string;
  siteConfig: SiteConfig;
  loginSettings?: LoginSettings;
  redirect?: string | null;
  displayName?: string;
}) {
  const {
    t,
    i18n: { language },
  } = useTranslation("otp");

  const supportLink = getSiteLink(siteConfig, "support", language);

  const genericErrorMessage = t("set.genericError");
  const invalidCodeMessage = t("set.invalidCode");
  const invalidCodeLengthMessage = t("set.invalidCodeLength");
  const router = useRouter();

  const localFormAction = async (_: FormState, formData?: FormData) => {
    const enteredCode = (formData?.get("code") as string) ?? "";
    const result = await handleOTPFormSubmit(enteredCode, {
      loginName,
      sessionId,
      organization,
      requestId,
      loginSettings,
      redirect,
    });

    if ("redirect" in result && result.redirect) {
      router.push(result.redirect);
    }

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
        <form action={formAction} noValidate>
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
