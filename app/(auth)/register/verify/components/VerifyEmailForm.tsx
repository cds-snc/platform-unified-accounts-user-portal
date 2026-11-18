"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState, useEffect } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { setRegistrationFlag } from "@lib/client/registration";
import { validateCode } from "@lib/validation/validationSchemas";
import { translateValidationErrors, type ValidationErrorKey } from "@lib/validation/validators";
import { I18n, useTranslation } from "@i18n";
import { useSiteConfig } from "@components/contexts/SiteConfigContext";
import { Alert as AlertNotification } from "@components/ui/alert/Alert";
import { Button } from "@components/ui/button/Button";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";
import { CodeEntry } from "@components/ui/form/CodeEntry";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { checkVerificationCode, sendVerificationEmail } from "../action";

type FormState = {
  errorKey?: string;
  validationErrors?: ValidationErrorKey[];
  formData?: {
    code?: string;
  };
};

export function VerifyEmailForm({
  requestId,
  children,
}: {
  userId: string;
  loginName?: string;
  requestId?: string;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    // Set global flag for ongoing registration flow
    setRegistrationFlag();
  });

  const router = useRouter();

  const { getSiteLink } = useSiteConfig();

  const { t } = useTranslation("verify");

  const supportLink = getSiteLink("support");

  const [resendErrorKey, setResendErrorKey] = useState<string>("");

  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const [codeSent, setCodeSent] = useState<boolean>(false);

  async function resendCode() {
    setResendErrorKey("");
    setCodeLoading(true);

    try {
      const response = await sendVerificationEmail();

      if (response && "errorKey" in response && response.errorKey) {
        setResendErrorKey(response.errorKey);
      } else {
        setCodeSent(true);
      }
    } catch {
      setResendErrorKey("errors.couldNotResentEmail");
    }
    setCodeLoading(false);
  }

  const localFormAction = async (
    previousState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const code = (formData.get("code") as string) || "";

    const validationResult = await validateCode({ code });
    if (!validationResult.success) {
      return {
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          errorKey: `validation.${issue.message}`,
          options: {
            maxLength: issue.type === "max_length" ? issue.requirement : undefined,
          },
        })),
        formData: { code },
      };
    }

    const response = await checkVerificationCode({
      code: code,
      requestId: requestId,
    });

    if (response && "errorKey" in response && response.errorKey) {
      return {
        errorKey: response.errorKey,
      };
    }

    if (response && "redirect" in response && response?.redirect) {
      router.push(response?.redirect);
    }

    return previousState;
  };

  const [rawState, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    errorKey: undefined,
    formData: {
      code: "",
    },
  });

  const state = {
    ...rawState,
    validationErrors: translateValidationErrors(rawState.validationErrors, t),
  };

  return (
    <>
      {state.errorKey && (
        <Alert
          type={ErrorStatus.ERROR}
          // heading={state.authError.title}
          focussable={true}
          id="zitadelError"
        >
          <I18n i18nKey={`verify:${state.errorKey}`} />
        </Alert>
      )}

      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />

      {children}

      {resendErrorKey && (
        <div className="py-4" data-testid="warning">
          <AlertNotification.Warning>
            <p className="mt-3 font-bold">{t(resendErrorKey)}</p>
          </AlertNotification.Warning>
        </div>
      )}

      {(codeLoading || codeSent) && (
        <AlertNotification.Info>
          <p className="mt-3 font-bold">
            {codeLoading && <I18n i18nKey="verify:sendingNewCode" />}
            {codeSent && <I18n i18nKey="verify:sentNewCode" />}
          </p>
        </AlertNotification.Info>
      )}

      <div className="w-full">
        <form id="verify-form" action={formAction} noValidate>
          <CodeEntry state={state} code={""} className="mt-10" />

          <div className="mt-8 mb-6 flex items-center gap-4">
            <Button
              theme="link"
              type="button"
              onClick={() => resendCode()}
              disabled={codeLoading}
              data-testid="resend-button"
            >
              <I18n i18nKey="verify:newCode" />
            </Button>
            {supportLink && (
              <Link href={supportLink} prefetch={false}>
                <I18n i18nKey="verify:help" />
              </Link>
            )}
          </div>

          <SubmitButtonAction>
            <I18n i18nKey="verify:submit" />
          </SubmitButtonAction>
        </form>
      </div>
    </>
  );
}
