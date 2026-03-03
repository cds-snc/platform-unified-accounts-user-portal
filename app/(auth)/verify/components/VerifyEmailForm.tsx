"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { sendVerification, sendVerificationEmail } from "@lib/server/verify";
import { validateCode } from "@lib/validationSchemas";
import { I18n, useTranslation } from "@i18n";
import * as AlertNotification from "@components/ui/alert/Alert";
import { Button } from "@components/ui/button/Button";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";
import { CodeEntry } from "@components/ui/form/CodeEntry";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";
const SUPPORT_URL = process.env.NEXT_PUBLIC_FORMS_PRODUCTION_URL || "";

type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    code?: string;
  };
};

export function VerifyEmailForm({
  userId,
  loginName,
  organization,
  requestId,
  code,
  children,
}: {
  userId: string;
  loginName?: string;
  organization?: string;
  code?: string;
  requestId?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const processedCodeRef = useRef<string | null>(null);
  const emailSentRef = useRef<boolean>(false);

  const {
    t,
    i18n: { language },
  } = useTranslation("verify");

  const [error, setError] = useState<string>("");

  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const [codeSent, setCodeSent] = useState<boolean>(false);

  async function resendCode() {
    setError("");
    setCodeLoading(true);

    try {
      const response = await sendVerificationEmail({
        userId,
      });

      if (response && "error" in response && response.error) {
        setError(response.error);
      } else {
        setCodeSent(true);
      }
    } catch {
      setError(t("errors.couldNotResendEmail"));
    }
    setCodeLoading(false);
  }

  // Send verification email once on component mount
  useEffect(() => {
    if (!emailSentRef.current) {
      emailSentRef.current = true;
      sendVerificationEmail({
        userId,
      }).catch(() => {
        // Silently fail - user can click resend if needed
      });
    }
  }, [userId]);

  useEffect(() => {
    // Only process if code exists and hasn't been processed yet
    if (code && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      sendVerification({
        code: code,
        userId,
        loginName: loginName,
        organization: organization,
        requestId: requestId,
      }).then((response) => {
        if (response && "redirect" in response && response?.redirect) {
          router.push(response?.redirect);
        }
      });
    }
  }, [code, userId, loginName, organization, requestId, router]);

  const localFormAction = async (previousState: FormState, formData: FormData) => {
    const code = (formData.get("code") as string) || "";

    // Validate form entries and map any errors to form state with translated messages
    const validationResult = await validateCode({ code });
    if (!validationResult.success) {
      return {
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`),
        })),
        formData: { code },
      };
    }

    const response = await sendVerification({
      code: code,
      userId,
      loginName: loginName,
      organization: organization,
      requestId: requestId,
    });

    if (response && "error" in response && response?.error) {
      return {
        error: response.error,
      };
    }

    if (response && "redirect" in response && response?.redirect) {
      router.push(response?.redirect);
    }

    return previousState;
  };

  const [state, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    error: undefined,
    formData: {
      code: "",
    },
  });

  return (
    <>
      {state.error && (
        <Alert
          type={ErrorStatus.ERROR}
          // heading={state.authError.title}
          focussable={true}
          id="zitadelError"
        >
          <I18n i18nKey={state.error} namespace="verify" />
        </Alert>
      )}

      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />

      {children}

      {error && (
        <div className="py-4" data-testid="warning">
          <AlertNotification.Warning>
            <p className="mt-3 font-bold">{error}</p>
          </AlertNotification.Warning>
        </div>
      )}

      {(codeLoading || codeSent) && (
        <AlertNotification.Info>
          <p className="mt-3 font-bold">
            {codeLoading && <I18n i18nKey="sendingNewCode" namespace="verify" />}
            {codeSent && <I18n i18nKey="sentNewCode" namespace="verify" />}
          </p>
        </AlertNotification.Info>
      )}

      <div className="w-full">
        <form action={formAction} noValidate>
          <CodeEntry state={state} code={code ?? ""} className="mt-10" />

          <div className="mb-6 mt-8 flex items-center gap-4">
            <Button
              theme="link"
              type="button"
              onClick={() => resendCode()}
              disabled={codeLoading}
              data-testid="resend-button"
            >
              <I18n i18nKey="newCode" namespace="verify" />
            </Button>
            <Link href={`${SUPPORT_URL}/${language}/support`}>
              <I18n i18nKey="help" namespace="verify" />
            </Link>
          </div>

          <SubmitButtonAction>
            <I18n i18nKey="submit" namespace="verify" />
          </SubmitButtonAction>
        </form>
      </div>
    </>
  );
}
