/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

import { isSessionValid, loadActiveSession } from "@lib/session";

import { YourAccountDropdown } from "./YourAccountDropdown";

export const YourAccount = async () => {
  const activeSession = await loadActiveSession().catch(() => {
    // this will throw if there is no active session
    return undefined;
  });

  if (!activeSession) {
    return null;
  }

  const valid = await isSessionValid({ session: activeSession });

  if (!valid) {
    return null;
  }

  return <YourAccountDropdown userName={activeSession.factors?.user?.loginName ?? ""} />;
};
