/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest, NextResponse } from "next/server";
import { Prompt } from "@zitadel/proto/zitadel/oidc/v2/authorization_pb";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { toAuthRequestId, toOidcRequestId } from "@lib/oidc-request-id";
import { constructUrl } from "@lib/service-url";
import { buildUrlWithRequestId } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { isRSCRequest, validateAuthRequest } from "@lib/utils/auth";
import { getAuthRequest } from "@lib/zitadel";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Defensive check: block RSC requests early
  if (isRSCRequest(searchParams)) {
    return NextResponse.json({ error: "RSC requests not supported" }, { status: 400 });
  }

  // Early validation: if no valid request parameters, return error immediately
  const requestId = validateAuthRequest(searchParams);
  if (!requestId) {
    return NextResponse.json({ error: "No valid authentication request found" }, { status: 400 });
  }

  const authRequestId = toAuthRequestId(requestId);

  const { authRequest } = await getAuthRequest({
    authRequestId,
  });

  const oidcRequestId = authRequest?.id
    ? toOidcRequestId(authRequest.id)
    : toOidcRequestId(requestId);

  // RP is requesting the registration flow
  if (authRequest && authRequest.prompt.includes(Prompt.CREATE)) {
    const registerUrl = constructUrl(request, "/before-you-start");
    registerUrl.searchParams.set("requestId", oidcRequestId);

    registerUrl.searchParams.set("organization", ZITADEL_ORGANIZATION);

    return NextResponse.redirect(registerUrl);
  }

  // All other flows go to interactive login

  const loginNameUrl = constructUrl(request, buildUrlWithRequestId("/", requestId));

  return NextResponse.redirect(loginNameUrl);
}
