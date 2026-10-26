/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest, NextResponse } from "next/server";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { verifyResetLink } from "@lib/server/password-reset";
import { constructUrl } from "@lib/service-url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const resetLink = await verifyResetLink(token);
  let path = "/password/reset";

  if (resetLink) {
    path = await createSessionAndUpdateCookie({
      checks: create(ChecksSchema, {
        user: { search: { case: "userId", value: resetLink.userId } },
      }),
      requestId: undefined,
    })
      .then(() => "/password/reset/verify")
      .catch((error) => {
        logMessage.warn("Password reset link session could not be created", { error });
        return "/password/reset";
      });
  }

  return NextResponse.redirect(constructUrl(request, path));
}
