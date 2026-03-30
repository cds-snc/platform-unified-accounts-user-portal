"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { validateUsername } from "@lib/validationSchemas";
import { useTranslation } from "@i18n/client";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { submitUserNameForm } from "../actions";
type Props = {
  organization?: string;
  requestId?: string;
};

type FormState = {
  formData: {
    username: string;
  };
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
};

export const UserNameForm = ({ organization, requestId }: Props) => {
  const { t } = useTranslation(["start", "common", "error"]);
  const genericErrorMessage = t("title", { ns: "error" });
  const router = useRouter();

  const localFormAction = async (previousState: FormState, formData?: FormData) => {
    const username = (formData?.get("username") as string) || "";

    // Validate form entries and map any errors to form state with translated messages
    const formEntriesData = formData ? Object.fromEntries(formData.entries()) : {};
    const validationResult = await validateUsername(formEntriesData);
    if (!validationResult.success) {
      return {
        ...previousState,
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`, { ns: "start" }),
        })),
        formData: {
          username: username,
        },
      };
    }

    const result = await submitUserNameForm({
      loginName: username,
      organization,
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

    if (result && "redirect" in result && result.redirect) {
      router.push(result.redirect);
    }

    return previousState;
  };

  const [state, formAction] = useActionState(localFormAction, {
    formData: {
      username: "",
    },
    validationErrors: undefined,
  });

  const getError = (fieldKey: string) => {
    return state.validationErrors?.find((e) => e.fieldKey === fieldKey)?.fieldValue || "";
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
            <div className="mb-4 text-sm text-black" id="login-description">
              {t("form.description")}
            </div>
            {getError("username") && (
              <ErrorMessage id={"errorMessageUsername"}>{getError("username")}</ErrorMessage>
            )}
            <TextInput
              type={"email"}
              id={"username"}
              required
              defaultValue={state.formData?.username || ""}
              ariaDescribedbyIds={getError("username") ? ["errorMessageUsername"] : undefined}
            />
          </div>
        </div>

        <SubmitButtonAction>{t("button.continue")}</SubmitButtonAction>
      </form>
    </div>
  );
};
