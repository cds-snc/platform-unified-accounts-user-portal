"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { UserNameForm } from "./UserNameForm";
type Props = {
  passwordComplexitySettings?: PasswordComplexitySettings;
  organization?: string;
  requestId?: string;
};

export function PasswordResetFlow({ organization, requestId }: Props) {
  return <UserNameForm organization={organization} requestId={requestId} />;
}
