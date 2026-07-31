"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { validateContactForm } from "@lib/validation/validationSchemas";
import { getError, hasError } from "@lib/validation/validators";
import { useTranslation } from "@i18n";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";
import { toast } from "@components/ui/toast/Toast";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { submitContactFormAction } from "../actions";

type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    fullName?: string;
    email?: string;
    message?: string;
  };
};

export function ContactUsForm() {
  const { t } = useTranslation(["contact-us", "common"]);
  const genericErrorMessage = t("errors.generic");
  const submitFailedMessage = t("errors.submitFailed");

  const localFormAction = async (
    previousState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const formEntries = {
      fullName: (formData.get("fullName") as string) || "",
      email: (formData.get("email") as string) || "",
      message: (formData.get("message") as string) || "",
    };

    const validationResult = await validateContactForm(formEntries);
    if (!validationResult.success) {
      return {
        error: undefined,
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`),
        })),
        formData: formEntries,
      };
    }

    const result = await submitContactFormAction(formEntries);

    if ("error" in result) {
      return {
        ...previousState,
        validationErrors: undefined,
        error: result.error,
        formData: formEntries,
      };
    }

    toast.success(t("success.title"));
    return {
      ...previousState,
      error: undefined,
      validationErrors: undefined,
      formData: formEntries,
    };
  };

  const [state, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    formData: {
      fullName: "",
      email: "",
      message: "",
    },
  });

  return (
    <div>
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
                hasError("fullName", state.validationErrors) ? ["errorMessageFullName"] : undefined
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

        <SubmitButtonAction>{t("button.submit", { ns: "common" })}</SubmitButtonAction>
      </form>
    </div>
  );
}
