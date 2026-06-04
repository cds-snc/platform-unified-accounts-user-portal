"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

import { useTranslation } from "@i18n";
import { PasswordValidationForm } from "@components/auth/password-validation/PasswordValidationForm";
import { Alert, ErrorStatus } from "@components/ui/form";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { resetPassword } from "../actions";
export function PasswordReset({
  passwordComplexitySettings,
}: {
  passwordComplexitySettings?: PasswordComplexitySettings;
}) {
  const { t } = useTranslation(["password"]);
  const [error, setError] = useState("");
  const [formResetKey, setFormResetKey] = useState(0);

  const setErrorAndResetForm = (message: string) => {
    setError(message);
    setFormResetKey((previous) => previous + 1);
  };

  const submitPasswordForm = async ({ password, code }: { password: string; code?: string }) => {
    const payload: { password: string; code?: string } = {
      password,
      ...(code ? { code } : {}),
    };

    await resetPassword(payload).catch((e) => {
      // translation of error messages handled server side
      setErrorAndResetForm(e.message);
    });
  };

  if (!passwordComplexitySettings) {
    return <Alert type={ErrorStatus.ERROR}>{t("reset.errors.missingRequiredInformation")}</Alert>;
  }

  return (
    <>
      {error && <Alert type={ErrorStatus.ERROR}>{error}</Alert>}
      <PasswordValidationForm
        key={formResetKey}
        passwordComplexitySettings={passwordComplexitySettings}
        successCallback={submitPasswordForm}
        requireConfirmationCode={true}
      />
    </>
  );
}
