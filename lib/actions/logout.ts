"use server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logoutCurrentSession as logoutCurrentSessionImpl } from "@lib/server/session";

export async function logoutCurrentSession(options: { postLogoutRedirectUri?: string } = {}) {
  return logoutCurrentSessionImpl(options);
}
