"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { type FormEvent, useRef, useState } from "react";
import { useHCaptcha } from "@gcforms/hcaptcha/client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { getError, hasError } from "@lib/validation/validators";
import { useTranslation } from "@i18n";
import { SubmitButton } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { submitContactFormAction } from "../actions";

type FormState = {
  success?: boolean;
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    fullName?: string;
    email?: string;
    message?: string;
  };
};

export function ContactUsForm({ siteKey }: { siteKey: string }) {
  const { t } = useTranslation(["contact-us", "common"]);
  const genericErrorMessage = t("errors.generic");
  const submitFailedMessage = t("errors.submitFailed");
  const [state, setState] = useState<FormState>({
    validationErrors: undefined,
    formData: {
      fullName: "",
      email: "",
      message: "",
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgress = useRef(false);

  const { captcha, execute, reset } = useHCaptcha({
    siteKey,
    failureMode: "block",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submissionInProgress.current) return;
    submissionInProgress.current = true;

    const formData = new FormData(event.currentTarget);
    const formEntries = {
      fullName: (formData.get("fullName") as string) || "",
      email: (formData.get("email") as string) || "",
      message: (formData.get("message") as string) || "",
    };

    const validationResult = await validateContactForm(formEntries);
    if (!validationResult.success) {
      submissionInProgress.current = false;
      setState({
        error: undefined,
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`),
        })),
        formData: formEntries,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const captchaResult = await execute();

      if (!captchaResult.verified) {
        reset();
        setState((previousState) => ({
          ...previousState,
          error: submitFailedMessage,
          validationErrors: undefined,
          formData: formEntries,
        }));
        return;
      }

      const result = await submitContactFormAction({
        ...formEntries,
        captchaToken: captchaResult.token,
      });

      if ("error" in result) {
        setState((previousState) => ({
          ...previousState,
          validationErrors: undefined,
          error: result.error,
          formData: formEntries,
        }));
        return;
      }

      setState({
        success: true,
        error: undefined,
        validationErrors: undefined,
        formData: formEntries,
      });
    } catch {
      setState((previousState) => ({
        ...previousState,
        error: submitFailedMessage,
        validationErrors: undefined,
        formData: formEntries,
      }));
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {state.success ? (
        <Alert
          type={ErrorStatus.SUCCESS}
          focussable={true}
          id="contactUsSuccess"
          heading={t("success.title")}
        >
          <p>{t("success.description")}</p>
        </Alert>
      ) : (
        <>
          <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />
          {state.error && (
            <Alert type={ErrorStatus.ERROR} focussable={true} id="contactUsError">
              {getSafeErrorMessage({
                error: state.error,
                fallback: genericErrorMessage,
                allowedMessages: [submitFailedMessage],
              })}
            </Alert>
          )}
          <form id="contact-us-form" onSubmit={handleSubmit} noValidate>
            <div className="mb-6 flex flex-col gap-4">
              <div className="gcds-input-wrapper">
                <Label htmlFor="fullName" required>
                  {t("labels.fullName")}
                </Label>
                {hasError("fullName", state.validationErrors) && (
                  <ErrorMessage id="errorMessageFullName">
                    {getError("fullName", state.validationErrors)}
                  </ErrorMessage>
                )}
                <TextInput
                  className="w-full"
                  type="text"
                  id="fullName"
                  autoComplete="name"
                  required
                  defaultValue={state.formData?.fullName ?? ""}
                  ariaDescribedbyIds={
                    hasError("fullName", state.validationErrors)
                      ? ["errorMessageFullName"]
                      : undefined
                  }
                  invalid={hasError("fullName", state.validationErrors)}
                />
              </div>

              <div className="gcds-input-wrapper">
                <Label htmlFor="email" required>
                  {t("labels.email")}
                </Label>
                {hasError("email", state.validationErrors) && (
                  <ErrorMessage id="errorMessageEmail">
                    {getError("email", state.validationErrors)}
                  </ErrorMessage>
                )}
                <TextInput
                  className="w-full"
                  type="email"
                  autoComplete="email"
                  required
                  id="email"
                  defaultValue={state.formData?.email ?? ""}
                  ariaDescribedbyIds={
                    hasError("email", state.validationErrors) ? ["errorMessageEmail"] : undefined
                  }
                  invalid={hasError("email", state.validationErrors)}
                />
              </div>

              <div className="gcds-textarea-wrapper">
                <Label htmlFor="message" required>
                  {t("labels.message")}
                </Label>
                {hasError("message", state.validationErrors) && (
                  <ErrorMessage id="errorMessageMessage">
                    {getError("message", state.validationErrors)}
                  </ErrorMessage>
                )}
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  defaultValue={state.formData?.message ?? ""}
                  aria-invalid={hasError("message", state.validationErrors)}
                  {...(hasError("message", state.validationErrors) && {
                    "aria-describedby": "errorMessageMessage",
                  })}
                />
              </div>
            </div>

            {captcha}
            <SubmitButton loading={isSubmitting}>
              {t("button.submit", { ns: "common" })}
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
