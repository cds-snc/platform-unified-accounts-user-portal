import { NextRequest, NextResponse } from "next/server";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { generateCSP, responseWithCSP } from "@lib/cspScripts";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     * - files with extensions (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|img/).*)",
  ],
};

BigInt.prototype.toJSON = function () {
  return this.toString();
};

export async function proxy(request: NextRequest) {
  // Add the original URL as a header to all requests
  const requestHeaders = new Headers(request.headers);

  // Set organization header for Zitadel
  requestHeaders.set("x-zitadel-i18n-organization", ZITADEL_ORGANIZATION);

  // Generate CSP once for this request; propagate nonce to layouts via request header
  const { csp, nonce } = generateCSP();
  requestHeaders.set("x-nonce", nonce);

  return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}
