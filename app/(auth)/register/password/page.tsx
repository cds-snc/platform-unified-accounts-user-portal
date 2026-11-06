/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { getPasswordComplexitySettings } from "@lib/zitadel";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { PasswordPageClient } from "./PasswordPageClient";

export default async function Page() {
  const passwordComplexitySettings = await getPasswordComplexitySettings().catch((_error) => {
    logMessage.warn("Failed to load password complexity settings for registration");
    return undefined;
  });

  if (!passwordComplexitySettings) {
    redirect("/register");
  }

  return (
    <AuthPanel
      titleI18nKey="register:password.title"
      descriptionI18nKey="register:password.description"
    >
      <PasswordPageClient passwordComplexitySettings={passwordComplexitySettings} />
    </AuthPanel>
  );
}
