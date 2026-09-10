/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";

import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { buildUrlWithRequestId, type SearchParams } from "@lib/utils";
import { getPasswordComplexitySettings } from "@lib/zitadel";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { PasswordReset } from "../components/PasswordReset";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;
  await checkAuthenticationLevel(AuthLevel.MFA_REQUIRED_NO_PASSWORD, requestId);

  const passwordComplexitySettings = await getPasswordComplexitySettings();

  if (!passwordComplexitySettings) {
    logMessage.error("Could not retrieve password complexity settings from Zitadel");
    redirect(buildUrlWithRequestId("/password/reset", requestId));
  }

  return (
    <AuthPanel
      titleI18nKey="reset.title"
      descriptionI18nKey="reset.description"
      namespace="password"
    >
      <PasswordReset
        passwordComplexitySettings={passwordComplexitySettings}
        requestId={requestId}
      />
    </AuthPanel>
  );
}
