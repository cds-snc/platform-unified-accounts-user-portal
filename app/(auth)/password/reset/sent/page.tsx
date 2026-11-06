/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getPasswordResetRequest } from "@lib/server/password-reset";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";

import { ResendCode } from "./components/ResendCode";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

export default async function Page() {
  const request = await getPasswordResetRequest();
  if (!request) redirect("/password/reset");
  const { loginName } = request;
  const loginNameParts = loginName ? loginName.split(".") : [];
  const displayName =
    loginNameParts.length > 1 ? `${loginNameParts[0]} ${loginNameParts[1]}` : loginName;

  return (
    <AuthPanel
      titleI18nKey="password:reset.sent.checkEmail"
      pageTitleI18nKey="password:reset.sent.checkEmail"
      descriptionI18nKey="none"
      imageSrc="/img/email-icon.png"
      variant="narrow"
      dataTestId="password-reset-sent"
    >
      {loginName && displayName && (
        <UserAvatar loginName={loginName} displayName={displayName} showDropdown={false} />
      )}
      <ResendCode />
    </AuthPanel>
  );
}
