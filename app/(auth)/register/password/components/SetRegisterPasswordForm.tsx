/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

import { getSafeErrorMessageFromKey } from "@lib/safeErrorMessage";
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
  inviteCode,
  requestId,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  email: string;
  firstname: string;
  lastname: string;
  requestId?: string;
  inviteCode?: string;
}) {
  const { t } = useTranslation(["password", "register"]);

  const [error, setError] = useState("");

  const successCallback = async ({ password }: { password: string }) => {
    // Validate account data again to be safe
    const validateAccountData = await validateAccount({ firstname, lastname, email } as {
      [k: string]: FormDataEntryValue;
    });
    if (!validateAccountData.success) {
      setError("password:create.missingOrInvalidData.title");
    }

    const response = await registerUser({
      email,
      firstName: firstname,
      lastName: lastname,
      password,
      requestId,
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
      {error && (
        <Alert type={ErrorStatus.ERROR}>
          {getSafeErrorMessageFromKey({
            errorKey: error,
            fallbackKey: "register:errors.couldNotRegisterUser",
            allowedErrorKeys: [
              "password:create.missingOrInvalidData.title",
              "register:errors.couldNotCreateUser",
              "register:errors.couldNotCreateSession",
              "register:errors.couldNotRegisterUser",
            ],
            t,
          })}
        </Alert>
      )}
      <PasswordValidationForm
        passwordComplexitySettings={passwordComplexitySettings}
        successCallback={successCallback}
      />
    </>
  );
}
