/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { validateAccount } from "@lib/validation/validationSchemas";
import { useTranslation } from "@i18n/client";
import { PasswordValidationForm } from "@components/auth/password-validation/PasswordValidationForm";
import { Alert, ErrorStatus } from "@components/ui/form";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { registerUser } from "../../actions";

export function SetRegisterPasswordForm({
  passwordComplexitySettings,
  email,
  firstname,
  lastname,
  requestId,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  email: string;
  firstname: string;
  lastname: string;
  requestId?: string;
}) {
  const { t } = useTranslation(["password"]);

  const [error, setError] = useState("");

  const successCallback = async ({ password }: { password: string }) => {
    // Validate account data again to be safe
    const validateAccountData = await validateAccount({ firstname, lastname, email } as {
      [k: string]: FormDataEntryValue;
    });
    if (!validateAccountData.success) {
      setError(t("create.missingOrInvalidData.title"));
    }

    const response = await registerUser({
      email,
      firstName: firstname,
      lastName: lastname,
      password,
      requestId,
    }).catch(() => setError(t("errors.couldNotRegisterUser")));

    if (response && "error" in response && response.error) {
      setError(response.error);
      return;
    }
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
