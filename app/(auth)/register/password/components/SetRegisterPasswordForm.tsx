/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { validateAccount } from "@lib/client/validationSchemas";
import { useTranslation } from "@i18n";
import { PasswordValidationForm } from "@components/auth/password-validation/PasswordValidationForm";
import { Alert, ErrorStatus } from "@components/ui/form";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { registerUser } from "../../actions";
import { useRegistration } from "../../context/RegistrationContext";
export function SetRegisterPasswordForm({
  passwordComplexitySettings,
  email,
  firstname,
  lastname,
  requestId,
  onSubmitSuccess,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  email: string;
  firstname: string;
  lastname: string;
  requestId?: string;
  onSubmitSuccess?: () => void;
}) {
  const { t } = useTranslation(["password"]);
  const router = useRouter();
  const { clearRegistrationData } = useRegistration();
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

    if (response && "redirect" in response && response.redirect) {
      // Signal successful submission before clearing data
      onSubmitSuccess?.();
      // Clear registration data from sessionStorage on successful registration
      clearRegistrationData();
      router.push(response.redirect);
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
