/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

import { getActiveSessionCookie } from "@lib/cookies";

import { YourAccountDropdown } from "./YourAccountDropdown";

export const YourAccount = async () => {
  const activeSession = await getActiveSessionCookie().catch(() => {
    // this will throw if there is no active session
    return undefined;
  });

  if (!activeSession) {
    return null;
  }

  const valid = parseInt(activeSession.expirationTs) > new Date().getTime();

  if (!valid) {
    return null;
  }

  return <YourAccountDropdown userName={activeSession.loginName ?? ""} />;
};
