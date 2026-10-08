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
import { completeInvite } from "../../actions";

export function SetRegisterPasswordForm({
  passwordComplexitySettings,
  email,
  firstname,
  lastname,
  inviteCode,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  email: string;
  firstname: string;
  lastname: string;
  requestId?: string;
  inviteCode?: string;
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

    /******************************
     * Refactor below when full registration is available
     */

    // const response = await registerUser({
    //   email,
    //   firstName: firstname,
    //   lastName: lastname,
    //   password,
    //   requestId,
    //   inviteCode,
    // });

    if (!inviteCode) {
      setError(t("create.missingOrInvalidData.title"));
      return;
    }

    const response = await completeInvite({
      email,
      firstName: firstname,
      lastName: lastname,
      password,
      inviteCode,
    });

    /*****
     * End region
     */

    if (response?.error) {
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
