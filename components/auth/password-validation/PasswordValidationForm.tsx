"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState, useState } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";
import * as v from "valibot";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { codeSchema, confirmPasswordSchema, passwordSchema } from "@lib/validationSchemas";
import { I18n, useTranslation } from "@i18n";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";
import { Hint } from "@components/ui/form/Hint";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { PasswordComplexity } from "./PasswordComplexity";
type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    password?: string;
    confirmPassword?: string;
    code?: string;
  };
};

const validateCreatePassword = async (
  formEntries: { [k: string]: FormDataEntryValue },
  passwordComplexitySettings = {},
  requireConfirmationCode = false
) => {
  const baseSchemaEntries = {
    ...passwordSchema(passwordComplexitySettings),
    ...confirmPasswordSchema(),
  };

  const schemaWithCode = v.pipe(
    v.object({
      ...baseSchemaEntries,
      ...codeSchema(),
    }),
    v.forward(
      v.check((input) => input.password === input.confirmPassword, "mustMatch"),
      ["confirmPassword"]
    )
  );

  const schemaWithoutCode = v.pipe(
    v.object(baseSchemaEntries),
    v.forward(
      v.check((input) => input.password === input.confirmPassword, "mustMatch"),
      ["confirmPassword"]
    )
  );

  const passwordValidationSchema = requireConfirmationCode ? schemaWithCode : schemaWithoutCode;
  return v.safeParse(passwordValidationSchema, formEntries, { abortPipeEarly: true });
};

export function PasswordValidationForm({
  passwordComplexitySettings,
  successCallback,
  requireConfirmationCode = false,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  successCallback?: ({ password, code }: { password: string; code?: string }) => void;
  requireConfirmationCode?: boolean;
}) {
  const { t } = useTranslation(["password"]);

  const [watchPassword, setWatchPassword] = useState("");

  const validateAndSubmit = async (previousState: FormState, formData: FormData) => {
    const formEntries = {
      password: (formData.get("password") as string) || "",
      confirmPassword: (formData.get("confirmPassword") as string) || "",
      ...((requireConfirmationCode && { code: (formData.get("code") as string) || "" }) || {}),
    };

    // Validate form entries and map any errors to form state with translated messages
    const formEntriesData = Object.fromEntries(formData.entries());
    const validationResult = await validateCreatePassword(
      formEntriesData,
      passwordComplexitySettings,
      requireConfirmationCode
    );

    if (!validationResult.success) {
      return {
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`complexity.${issue.message}`, {
            minLength: passwordComplexitySettings.minLength || 8,
          }),
        })),
        formData: formEntries,
      };
    }

    if (validationResult.success) {
      successCallback?.({
        password: formEntries.password as string,
        ...(requireConfirmationCode ? { code: formEntries.code as string } : {}),
      });
    }

    return previousState;
  };

  const [state, formAction] = useActionState(validateAndSubmit, {
    error: undefined,
    validationErrors: undefined,
    formData: {
      password: "",
      confirmPassword: "",
      ...(requireConfirmationCode ? { code: "" } : {}),
    },
  });

  const getError = (fieldKey: string) => {
    return state.validationErrors?.find((e) => e.fieldKey === fieldKey)?.fieldValue || "";
  };

  const [dirty, setDirty] = useState(false);

  return (
    <>
      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />
      <form className="w-full" action={formAction} noValidate onChange={() => setDirty(true)}>
        <div className="mb-4 grid grid-cols-1 gap-4 pt-4">
          {requireConfirmationCode && (
            <div className="gcds-input-wrapper">
              <Label htmlFor="code" required>
                {t("reset.labels.confirmationCode")}
              </Label>
              {getError("code") && (
                <ErrorMessage id={"errorMessageCode"}>{t(getError("code"))}</ErrorMessage>
              )}
              <TextInput
                id="code"
                className="w-full"
                type="text"
                required
                autoComplete="one-time-code"
                invalid={!!getError("code")}
              />
            </div>
          )}
          <div className="gcds-input-wrapper">
            <Label htmlFor="password" required>
              {t("create.labels.password")}
            </Label>
            {getError("password") && (
              <ErrorMessage id={"errorMessagePassword"}>{t(getError("password"))}</ErrorMessage>
            )}
            <Hint>
              <div className="mb-2">
                <I18n i18nKey="create.passwordHint" namespace="password" />
              </div>
              {passwordComplexitySettings && (
                <PasswordComplexity
                  passwordComplexitySettings={passwordComplexitySettings}
                  password={watchPassword}
                  id="password-complexity-requirements"
                  ready={dirty}
                />
              )}
            </Hint>
            <TextInput
              id="password"
              className="w-full"
              type="password"
              required
              ariaDescribedbyIds={
                getError("password")
                  ? ["errorMessagePassword", "password-complexity-requirements"]
                  : "password-complexity-requirements"
              }
              defaultValue={state.formData?.password ?? ""}
              onChange={(e) => setWatchPassword(e.target.value)}
              invalid={!!getError("password")}
            />
          </div>
          <div className="gcds-input-wrapper">
            <Label htmlFor="confirmPassword" required>
              {t("create.labels.confirmPassword")}
            </Label>
            {getError("confirmPassword") && (
              <ErrorMessage id={"errorMessageConfirmPassword"}>
                {getError("confirmPassword")}
              </ErrorMessage>
            )}
            <TextInput
              id="confirmPassword"
              className="w-full"
              type="password"
              required
              ariaDescribedbyIds={
                getError("confirmPassword") ? "errorMessageConfirmPassword" : undefined
              }
              defaultValue={state.formData?.confirmPassword ?? ""}
              invalid={!!getError("confirmPassword")}
            />
          </div>
        </div>

        <SubmitButtonAction>{t("button.continue", { ns: "common" })}</SubmitButtonAction>
      </form>
    </>
  );
}
