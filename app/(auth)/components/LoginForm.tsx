"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { buildUrlWithRequestId } from "@lib/utils";
import { validateUsernameAndPassword } from "@lib/validationSchemas";
import { getError, hasError } from "@lib/validators";
import { useTranslation } from "@i18n";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { submitLoginForm } from "../actions";
type Props = {
  requestId?: string;
  organization?: string;
};

type FormState = {
  formData: {
    username: string;
    password: string;
  };
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
};

export function LoginForm({ requestId }: Props) {
  const { t } = useTranslation(["start", "common"]);
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const genericLoginError = t("validation.invalidCredentials", { ns: "start" });

  const localFormAction = async (previousState: FormState, formData?: FormData) => {
    setLoading(true);

    const username = (formData?.get("username") as string) || "";
    const password = formData?.get("password") as string;

    // Validate form entries and map any errors to form state with translated messages
    const formEntriesData = formData ? Object.fromEntries(formData.entries()) : {};
    const validationResult = await validateUsernameAndPassword(formEntriesData);

    if (!validationResult.success) {
      setLoading(false);
      return {
        ...previousState,
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`, { ns: "start" }),
        })),
        formData: {
          username: username,
          password: password,
        },
      };
    }

    let response;
    try {
      response = await submitLoginForm({
        username: username,
        password: password,
        requestId,
      });
    } catch (e) {
      response = {
        error: t("validation.invalidCredentials"),
      };
    }
    setLoading(false);

    if (response && "error" in response && response.error) {
      return {
        ...previousState,
        validationErrors: undefined,
        error: response.error,
        formData: { username, password: "" },
      };
    }

    if (response && "redirect" in response && response.redirect) {
      router.push(response.redirect);
    }

    return previousState;
  };

  const [state, formAction] = useActionState(localFormAction, {
    formData: {
      username: "",
      password: "",
    },
  });

  return (
    <div>
      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />

      {state.error && (
        <div className="py-4" data-testid="error">
          <Alert type={ErrorStatus.ERROR} focussable={true} id="loginError">
            {getSafeErrorMessage({
              error: state.error,
              fallback: genericLoginError,
              allowedMessages: [genericLoginError],
            })}
          </Alert>
        </div>
      )}

      <form id="login" action={formAction} noValidate>
        {/* Username field */}
        <div className="mb-4">
          <div className="gcds-input-wrapper">
            <Label id={"label-username"} htmlFor={"username"} className="required" required>
              {t("form.label")}
            </Label>
            <div className="mb-4 text-sm text-black" id="login-description">
              {t("form.description")}
            </div>
            {hasError("username", state.validationErrors) && (
              <ErrorMessage id={"errorMessageUsername"}>
                {getError("username", state.validationErrors)}
              </ErrorMessage>
            )}
            <TextInput
              type={"email"}
              id={"username"}
              required
              autoComplete={"email"}
              defaultValue={state.formData?.username || ""}
              ariaDescribedbyIds={
                hasError("username", state.validationErrors)
                  ? ["login-description", "errorMessageUsername"]
                  : "login-description"
              }
              invalid={hasError("password", state.validationErrors)}
            />
          </div>
        </div>

        {/* Password field */}
        <div className="mb-4">
          <div className="gcds-input-wrapper">
            <Label id={"label-password"} htmlFor={"password"} className="required" required>
              {t("form.passwordLabel")}
            </Label>
            {getError("password", state.validationErrors) && (
              <ErrorMessage id={"errorMessagePassword"}>
                {getError("password", state.validationErrors)}
              </ErrorMessage>
            )}
            <TextInput
              type={"password"}
              id={"password"}
              required
              autoComplete={"current-password"}
              ariaDescribedbyIds={
                hasError("password", state.validationErrors) ? ["errorMessagePassword"] : undefined
              }
              invalid={hasError("password", state.validationErrors)}
            />

            {/* Forgot password link */}
            <div className="mt-2">
              <Link href={buildUrlWithRequestId("/password/reset", requestId)}>
                {t("form.forgotPasswordLink")}
              </Link>
            </div>
          </div>
        </div>

        <SubmitButtonAction disabled={loading}>
          {loading ? t("form.signingIn") : t("form.submit")}
        </SubmitButtonAction>
      </form>
    </div>
  );
}
