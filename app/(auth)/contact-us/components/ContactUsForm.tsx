"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState, useRef } from "react";
import { useHCaptcha } from "@gcforms/hcaptcha/client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { cn } from "@lib/utils";
import { CONTACT_US_ISSUE_TYPES, ISSUE_TYPE_I18N_KEYS } from "@lib/validation/contactUsIssueTypes";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { getError, hasError } from "@lib/validation/validators";
import { useTranslation } from "@i18n";
import { SubmitButton } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";
import { CaptchaFail } from "@components/ui/form-captcha/CaptchaFail";

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
    issueType?: string;
    message?: string;
  };
};

export function ContactUsForm({ siteKey }: { siteKey: string }) {
  const {
    t,
    i18n: { language },
  } = useTranslation(["contact-us", "common"]);
  const genericErrorMessage = t("errors.generic");
  const submitFailedMessage = t("errors.submitFailed");
  const initialState: FormState = {
    validationErrors: undefined,
    formData: {
      fullName: "",
      email: "",
      issueType: "",
      message: "",
    },
  };
  const submissionInProgress = useRef(false);

  const { captcha, execute, reset } = useHCaptcha({ siteKey });

  const handleSubmit = async (previousState: FormState, formData: FormData) => {
    if (submissionInProgress.current) return previousState;
    submissionInProgress.current = true;

    const formEntries = {
      fullName: (formData.get("fullName") as string) || "",
      email: (formData.get("email") as string) || "",
      issueType: (formData.get("issueType") as string) || "",
      message: (formData.get("message") as string) || "",
    };

    const validationResult = await validateContactForm(formEntries);
    if (!validationResult.success) {
      submissionInProgress.current = false;
      return {
        error: undefined,
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`),
        })),
        formData: formEntries,
      };
    }
    const normalizedEntries = validationResult.output;

    try {
      const captchaResult = await execute();

      if (!captchaResult.verified) {
        reset();
        return {
          error: "captchaFailed",
          validationErrors: undefined,
          formData: normalizedEntries,
        };
      }

      const result = await submitContactFormAction({
        ...normalizedEntries,
        captchaToken: captchaResult.token,
        language,
      });

      if ("error" in result) {
        return {
          validationErrors: undefined,
          error: result.error,
          formData: normalizedEntries,
        };
      }

      return {
        success: true,
        error: undefined,
        validationErrors: undefined,
        formData: normalizedEntries,
      };
    } catch {
      return {
        error: submitFailedMessage,
        validationErrors: undefined,
        formData: normalizedEntries,
      };
    } finally {
      submissionInProgress.current = false;
    }
  };

  const [state, formAction, isPending] = useActionState(handleSubmit, initialState);

  if (state.error === "captchaFailed") {
    return <CaptchaFail />;
  }

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
          <form id="contact-us-form" action={formAction} noValidate>
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

              <div
                className={cn(
                  "gcds-select-wrapper",
                  hasError("issueType", state.validationErrors) && "gcds-error"
                )}
              >
                <Label htmlFor="issueType" required>
                  {t("labels.issueType")}
                </Label>
                {hasError("issueType", state.validationErrors) && (
                  <ErrorMessage id="errorMessageIssueType">
                    {getError("issueType", state.validationErrors)}
                  </ErrorMessage>
                )}
                <select
                  key={state.formData?.issueType}
                  id="issueType"
                  name="issueType"
                  required
                  defaultValue={state.formData?.issueType ?? ""}
                  aria-invalid={hasError("issueType", state.validationErrors)}
                  {...(hasError("issueType", state.validationErrors) && {
                    "aria-describedby": "errorMessageIssueType",
                  })}
                >
                  <option value="" disabled>
                    {t("issueTypeOptions.placeholder")}
                  </option>
                  {CONTACT_US_ISSUE_TYPES.map((issueType) => (
                    <option key={issueType} value={issueType}>
                      {t(ISSUE_TYPE_I18N_KEYS[issueType])}
                    </option>
                  ))}
                </select>
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
            <SubmitButton loading={isPending}>{t("button.submit", { ns: "common" })}</SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
