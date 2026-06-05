"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { PasswordValidationForm } from "@components/auth/password-validation/PasswordValidationForm";
import { Alert, ErrorStatus } from "@components/ui/form";

import { changePasswordFormAction } from "../action";
type Props = {
  passwordComplexitySettings: PasswordComplexitySettings;
  requestId?: string;
};

export function ChangePasswordForm({ passwordComplexitySettings, requestId }: Props) {
  const [error, setError] = useState("");

  const successCallback = async ({ password }: { password: string }) => {
    if (typeof password !== "string") {
      setError("Invalid Field");
    }

    // Error translation handled server side
    await changePasswordFormAction(password, requestId).catch((e) => setError(e.message));
  };

  return (
    <>
      {error && <Alert type={ErrorStatus.ERROR}>{error}</Alert>}
      <PasswordValidationForm
        passwordComplexitySettings={passwordComplexitySettings}
        successCallback={successCallback}
      />
    </>
  );
}
