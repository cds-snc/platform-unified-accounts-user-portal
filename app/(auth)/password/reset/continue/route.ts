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
import { buildUrlWithRequestId } from "@lib/utils";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId") ?? undefined;
  const resetSession = openResetSession(
    request.nextUrl.searchParams.get("token") ?? "",
    (await getPasswordResetCookie()) ?? ""
  );

  const path = resetSession
    ? await addExistingSessionToCookie({ ...resetSession, requestId })
        .then(() => "/password/reset/verify")
        .catch(() => {
          logMessage.info("Password reset link session could not be loaded");
          return "/password/reset";
        })
    : "/password/reset";

  return NextResponse.redirect(constructUrl(request, buildUrlWithRequestId(path, requestId)));
}
