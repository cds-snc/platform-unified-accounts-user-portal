/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest, NextResponse } from "next/server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getPasswordResetCookie } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { addExistingSessionToCookie } from "@lib/server/cookie";
import { openResetSession } from "@lib/server/password-reset";
import { constructUrl } from "@lib/service-url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const key = (await getPasswordResetCookie()) ?? "";
  const resetSession = openResetSession(token, key);
  let path = "/password/reset";

  if (resetSession) {
    path = await addExistingSessionToCookie({ ...resetSession, requestId: undefined })
      .then(() => "/password/reset/verify")
      .catch((error) => {
        logMessage.warn("Password reset link session could not be loaded", { error });
        return "/password/reset";
      });
  }

  return NextResponse.redirect(constructUrl(request, path));
}
