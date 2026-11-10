"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { validateUsername } from "@lib/validation/validationSchemas";
import {
  getError,
  hasError,
  translateValidationErrors,
  type ValidationErrorKey,
} from "@lib/validation/validators";
import { useTranslation } from "@i18n/client";
import { BackButton } from "@components/ui/button/BackButton";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { submitUserNameForm } from "../actions";
type Props = {
  requestId?: string;
};

type FormState = {
  formData: {
    username: string;
  };
  error?: string;
  pending?: boolean;
  validationErrors?: ValidationErrorKey[];
};

export const UserNameForm = ({ requestId }: Props) => {
  const { t } = useTranslation(["start", "common", "error", "password"]);
  const genericErrorMessage = t("title", { ns: "error" });

  const localFormAction = async (
    previousState: FormState,
    formData?: FormData
  ): Promise<FormState> => {
    const username = (formData?.get("username") as string) || "";

    const formEntriesData = formData ? Object.fromEntries(formData.entries()) : {};
    const validationResult = await validateUsername(formEntriesData);
    if (!validationResult.success) {
      return {
        ...previousState,
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          errorKey: `validation.${issue.message}`,
          options: { ns: "start" },
        })),
        formData: {
          username: username,
        },
      };
    }

    const result = await submitUserNameForm({
      loginName: username,
      requestId,
    }).catch(() => {
      return {
        error: "Internal Error",
      };
    });

    if (result && "error" in result && result.error) {
      return {
        ...previousState,
        error: result.error,
        formData: {
          username: username,
        },
      };
    }

    return { formData: { username }, pending: true };
  };

  const [rawState, formAction] = useActionState(localFormAction, {
    formData: {
      username: "",
    },
    validationErrors: undefined,
  });

  const state = {
    ...rawState,
    validationErrors: translateValidationErrors(rawState.validationErrors, t),
  };

  return (
    <div>
      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />

      {state.error && (
        <Alert
          type={ErrorStatus.ERROR}
          heading={getSafeErrorMessage({
            error: state.error,
            fallback: genericErrorMessage,
            allowedMessages: [genericErrorMessage],
          })}
          focussable={true}
          id="cognitoErrors"
        >
          {getSafeErrorMessage({
            error: state.error,
            fallback: genericErrorMessage,
            allowedMessages: [genericErrorMessage],
          })}
        </Alert>
      )}

      <form id="login" action={formAction} noValidate>
        <div className="mb-4">
          <div className="gcds-input-wrapper">
            <Label id={"label-username"} htmlFor={"username"} className="required" required>
              {t("form.label")}
            </Label>
            {hasError("username", state.validationErrors) && (
              <ErrorMessage id={"errorMessageUsername"}>
                {getError("username", state.validationErrors)}
              </ErrorMessage>
            )}
            <TextInput
              type={"email"}
              id={"username"}
              required
              defaultValue={state.formData?.username || ""}
              ariaDescribedbyIds={
                hasError("username", state.validationErrors)
                  ? ["login-description", "errorMessageUsername"]
                  : "login-description"
              }
              invalid={hasError("username", state.validationErrors)}
              dataTestId="forgot-password-username"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <BackButton />
          <SubmitButtonAction dataTestId="forgot-password-continue">
            {t("common:button.continue")}
          </SubmitButtonAction>
        </div>
      </form>
    </div>
  );
};
