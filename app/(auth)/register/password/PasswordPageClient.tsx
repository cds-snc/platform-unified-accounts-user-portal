"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { useRegistration } from "../context/RegistrationContext";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { SetRegisterPasswordForm } from "./components/SetRegisterPasswordForm";
type Props = {
  passwordComplexitySettings: PasswordComplexitySettings;
};

export function PasswordPageClient({ passwordComplexitySettings }: Props) {
  const router = useRouter();
  const { registrationData, isHydrated } = useRegistration();

  useEffect(() => {
    // Once hydrated, if no registration data exists and form wasn't submitted, redirect to step 1
    if (isHydrated && !registrationData) {
      router.replace("/register");
    }
  }, [isHydrated, registrationData, router]);

  // Show nothing while hydrating from sessionStorage
  if (!isHydrated) {
    return null;
  }

  // Show nothing while redirecting (no registration data and didn't submit)
  if (!registrationData) {
    return null;
  }

  return (
    <SetRegisterPasswordForm
      passwordComplexitySettings={passwordComplexitySettings}
      email={registrationData?.email ?? ""}
      firstname={registrationData?.firstname ?? ""}
      lastname={registrationData?.lastname ?? ""}
      requestId={registrationData?.requestId}
    />
  );
}
