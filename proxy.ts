import { NextRequest, NextResponse } from "next/server";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { generateCSP, responseWithCSP } from "@lib/cspScripts";
import { applyCustomRequestHeaders } from "@lib/utils/headers";

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

  // Only proxy paths need to be rewritten to the ZITADEL backend
  const proxyPaths = ["/.well-known/openid-configuration", "/oauth/", "/oidc/"];
  const isMatched = proxyPaths.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isMatched) {
    const backendZitadelInstance = process.env.ZITADEL_API_URL;
    if (!backendZitadelInstance) {
      // fail safe - process request that will return 404
      return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
    }

    applyCustomRequestHeaders(requestHeaders, process.env.CUSTOM_REQUEST_HEADERS);

    request.nextUrl.href = `${backendZitadelInstance}${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.rewrite(request.nextUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}
