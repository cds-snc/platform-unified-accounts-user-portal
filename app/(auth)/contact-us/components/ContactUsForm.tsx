"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import * as v from "valibot";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getError, hasError } from "@lib/validation/validators";
import { useTranslation } from "@i18n";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

const contactFormSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredFullName"),
    v.maxLength(250, "maxLengthFullName")
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredEmail"),
    v.maxLength(254, "maxLengthEmail"),
    v.email("invalidEmail")
  ),
  message: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredMessage"),
    v.maxLength(2000, "maxLengthMessage")
  ),
});

type FormState = {
  success?: boolean;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    fullName?: string;
    email?: string;
    message?: string;
  };
};

export function ContactUsForm() {
  const { t } = useTranslation(["contact-us", "common"]);

  const localFormAction = async (
    previousState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const formEntries = {
      fullName: (formData.get("fullName") as string) || "",
      email: (formData.get("email") as string) || "",
      message: (formData.get("message") as string) || "",
    };

    const validationResult = v.safeParse(contactFormSchema, formEntries);
    if (!validationResult.success) {
      return {
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`),
        })),
        formData: formEntries,
      };
    }

    return { success: true };
  };

  const [state, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    formData: {
      fullName: "",
      email: "",
      message: "",
    },
  });

  if (state.success) {
    return (
      <Alert type={ErrorStatus.SUCCESS} heading={t("success.title")} focussable={true}>
        <p>{t("success.description")}</p>
      </Alert>
    );
  }

  return (
    <div>
      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />
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
