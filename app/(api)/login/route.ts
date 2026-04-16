/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { isRSCRequest, validateAuthRequest } from "@lib/auth-utils";
import { FlowInitiationParams, handleOIDCFlowInitiation } from "@lib/server/flow-initiation";
import { loadSessionsWithCookies } from "@lib/server/session";
import { getServiceUrlFromHeaders } from "@lib/service-url";

export const dynamic = "force-dynamic";
export const revalidate = false;
export const fetchCache = "default-no-store";
// Add this to prevent RSC requests
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

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

  const { sessions, sessionCookies } = await loadSessionsWithCookies({
    serviceUrl,
  });

  // Flow initiation - delegate to appropriate handler
  const flowParams: FlowInitiationParams = {
    serviceUrl,
    requestId,
    sessions,
    sessionCookies,
    request,
  };

  if (requestId.startsWith("oidc_")) {
    return handleOIDCFlowInitiation(flowParams);
  } else {
    return NextResponse.json({ error: "Invalid request ID format" }, { status: 400 });
  }
}
