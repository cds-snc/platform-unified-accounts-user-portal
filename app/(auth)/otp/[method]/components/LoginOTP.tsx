"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { getSiteLink, SiteConfig } from "@lib/site-config";
import { I18n, useTranslation } from "@i18n";
import { UserAvatar } from "@components/account/user-avatar";
import { BackButton } from "@components/ui/button/BackButton";
import { Button } from "@components/ui/button/Button";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";
import { CodeEntry } from "@components/ui/form/CodeEntry";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { FormState, handleOTPFormSubmit, updateSessionForOTPChallenge } from "../actions";

export function LoginOTP({
  loginName,
  sessionId,
  requestId,
  organization,
  method,
  code,
  siteConfig,
  loginSettings,
  redirect,
  displayName,
}: {
  loginName?: string; // either loginName or sessionId must be provided
  sessionId?: string;
  requestId?: string;
  organization?: string;
  method: string;
  code?: string;
  siteConfig: SiteConfig;
  loginSettings?: LoginSettings;
  redirect?: string | null;
  displayName?: string;
}) {
  const {
    t,
    i18n: { language },
  } = useTranslation("otp");
  const genericErrorMessage = t("set.genericError");
  const invalidCodeMessage = t("set.invalidCode");
  const invalidCodeLengthMessage = t("set.invalidCodeLength");
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const router = useRouter();
  const initialized = useRef(false);

  const requestOTPChallenge = async () => {
    const { error } = await updateSessionForOTPChallenge({
      loginName,
      sessionId,
      organization,
      requestId,
      method,
    });

    return !error;
  };

  useEffect(() => {
    if (!initialized.current && method === "email" && !code) {
      initialized.current = true;
      requestOTPChallenge().catch(() => false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localFormAction = async (_: FormState, formData?: FormData) => {
    const code = (formData?.get("code") as string) ?? "";
    const result = await handleOTPFormSubmit(code, {
      loginName,
      sessionId,
      organization,
      requestId,
      method,
      loginSettings,
      redirect,
    });

    if ("redirect" in result && result.redirect) {
      router.push(result.redirect);
    }

    return result;
  };

  const resendCode = async () => {
    setCodeSent(false);
    setCodeLoading(true);
    try {
      const success = await requestOTPChallenge();
      setCodeSent(success);
      setCodeLoading(false);
    } catch {
      setCodeSent(false);
      setCodeLoading(false);
    }
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

      {method === "email" && (
        <I18n i18nKey="verify.emailDescription" namespace="otp" tagName="p" className="mb-3" />
      )}

      <UserAvatar loginName={loginName} displayName={displayName} showDropdown={false} />

      <div className="w-full">
        <form action={formAction} noValidate>
          <CodeEntry state={state} code={code ?? ""} className="mt-8" />
          <div className="mt-6 flex items-center gap-4">
            <BackButton />
            <SubmitButtonAction>
              <I18n i18nKey="submit" namespace="verify" />
            </SubmitButtonAction>
          </div>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <Link href={getSiteLink(siteConfig, "support", language)}>
            <I18n i18nKey="help" namespace="verify" />
          </Link>
          {method === "email" && (
            <div className="flex whitespace-nowrap" aria-live="polite">
              <Button
                theme="link"
                type="button"
                onClick={() => resendCode()}
                data-testid="resend-button"
              >
                <I18n i18nKey="newCode" namespace="verify" />
              </Button>
              {codeLoading && (
                <I18n
                  i18nKey="sendingNewCode"
                  namespace="verify"
                  tagName="p"
                  className="ml-4 text-emerald-700"
                />
              )}
              {codeSent && (
                <I18n
                  i18nKey="sentNewCode"
                  namespace="verify"
                  className="ml-4 text-emerald-700"
                  tagName="span"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
