/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest, NextResponse } from "next/server";

import { FlowInitiationParams, handleOIDCFlowInitiation } from "@lib/server/flow-initiation";
import { loadSessionsWithCookies } from "@lib/server/session";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { isRSCRequest, validateAuthRequest } from "@lib/utils/auth";

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

  const { sessions, sessionCookies } = await loadSessionsWithCookies({});

  // Flow initiation - delegate to appropriate handler
  const flowParams: FlowInitiationParams = {
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
