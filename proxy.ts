import { NextRequest, NextResponse } from "next/server";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { generateCSP, responseWithCSP } from "@lib/cspScripts";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const config = {
  matcher: [
    "/:path*", // Match all paths
  ],
};

export async function proxy(request: NextRequest) {
  // Add the original URL as a header to all requests
  const requestHeaders = new Headers(request.headers);

  // Set organization header for Zitadel
  requestHeaders.set("x-zitadel-i18n-organization", ZITADEL_ORGANIZATION);

  // Generate CSP once for this request; propagate nonce to layouts via request header
  const { csp, nonce } = generateCSP();
  requestHeaders.set("x-nonce", nonce);

  // Add the current path so it can be read in lib functions / server components
  requestHeaders.set("x-current-path", request.nextUrl.pathname);

  return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}
