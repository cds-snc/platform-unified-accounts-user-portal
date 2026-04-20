import { NextRequest, NextResponse } from "next/server";
import { SecuritySettings } from "@zitadel/proto/zitadel/settings/v2/security_settings_pb";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { generateCSP, responseWithCSP } from "@lib/cspScripts";
import { logMessage } from "@lib/logger";

import {
  API_ROUTES,
  AUTH_FLOW_ROUTES,
  getRequiredAuthLevel,
  matchesPattern,
} from "./lib/middleware-config";
import {
  AuthLevel,
  checkAuthenticationLevel,
  getSmartRedirect,
  requiresStrongMfaSetupVerification,
} from "./lib/server/route-protection";
import { getServiceUrlFromHeaders } from "./lib/service-url";
import { loadSessionById } from "./lib/session";

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

async function loadSecuritySettings(request: NextRequest): Promise<SecuritySettings | null> {
  const securityResponse = await fetch(`${request.nextUrl.origin}/security`);

  if (!securityResponse.ok) {
    logMessage.error(`Failed to fetch security settings: ${securityResponse.statusText}`);
    return null;
  }

  const response = await securityResponse.json();

  if (!response || !response.settings) {
    logMessage.error("No security settings found in the response.");
    return null;
  }

  return response.settings;
}

function isMfaSetupRoute(pathname: string): boolean {
  return (
    pathname === "/mfa/set" ||
    pathname.startsWith("/mfa/set/") ||
    pathname === "/u2f/set" ||
    pathname.startsWith("/u2f/set/") ||
    pathname === "/otp/time-based/set" ||
    pathname.startsWith("/otp/time-based/set/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Add the original URL as a header to all requests
  const requestHeaders = new Headers(request.headers);

  // Set organization header for Zitadel
  requestHeaders.set("x-zitadel-i18n-organization", ZITADEL_ORGANIZATION);

  // Generate CSP once for this request; propagate nonce to layouts via request header
  const { csp, nonce } = generateCSP();
  requestHeaders.set("x-nonce", nonce);

  // Only run the proxy logic for OIDC paths
  const proxyPaths = ["/.well-known/", "/oauth/", "/oidc/", "/idps/callback/"];
  const isProxyPath = proxyPaths.some((prefix) => pathname.startsWith(prefix));

  // Handle OIDC proxy paths
  if (isProxyPath) {
    // escape proxy if the environment is not setup for multitenancy
    if (!process.env.ZITADEL_API_URL || !process.env.ZITADEL_SERVICE_USER_TOKEN) {
      return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
    }

    const { serviceUrl } = getServiceUrlFromHeaders(request.headers);

    const instanceHost = `${serviceUrl}`.replace("https://", "").replace("http://", "");

    // Add additional headers for proxy
    requestHeaders.set("x-zitadel-public-host", `https://${request.headers.get("host")}`);
    requestHeaders.set("x-zitadel-instance-host", instanceHost);

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    const securitySettings = await loadSecuritySettings(request);

    const contentSecurityPolicy = securitySettings?.embeddedIframe?.enabled
      ? csp.replace(
          /frame-ancestors\s+[^;]+;/,
          `frame-ancestors ${securitySettings.embeddedIframe.allowedOrigins.join(" ")};`
        )
      : csp;

    responseHeaders.set("Content-Security-Policy", contentSecurityPolicy);

    if (securitySettings?.embeddedIframe?.enabled) {
      responseHeaders.delete("X-Frame-Options");
    }

    request.nextUrl.href = `${serviceUrl}${pathname}${request.nextUrl.search}`;

    return NextResponse.rewrite(request.nextUrl, {
      request: {
        headers: requestHeaders,
      },
      headers: responseHeaders,
    });
  }

  // Skip auth checks for API routes
  if (matchesPattern(pathname, API_ROUTES)) {
    return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  // Get service URL for auth checks
  const { serviceUrl } = getServiceUrlFromHeaders(request.headers);

  // Determine required authentication level for this route
  const requiredLevel = getRequiredAuthLevel(pathname);

  // Skip check for open routes
  if (requiredLevel === AuthLevel.OPEN) {
    return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  // Check authentication level (loginName will be extracted from session cookie)
  const authCheck = await checkAuthenticationLevel(
    serviceUrl,
    requiredLevel,
    undefined, // loginName extracted from session cookie
    ZITADEL_ORGANIZATION
  );

  // If satisfied, allow the request
  if (authCheck.satisfied) {
    return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  // Special handling for auth flow routes
  // Allow partial authentication if user is progressing through multi-step flows
  // This works both with OIDC flows (requestId present) and standalone auth
  const isAuthFlowRoute = matchesPattern(pathname, AUTH_FLOW_ROUTES);

  if (isAuthFlowRoute) {
    // Allow access to MFA pages if password is verified
    if (pathname.startsWith("/mfa") || pathname.startsWith("/otp") || pathname.startsWith("/u2f")) {
      const session = authCheck.session;
      const hasPassword = session?.factors?.password?.verifiedAt;

      if (hasPassword) {
        if (isMfaSetupRoute(pathname) && session?.id) {
          try {
            const setupSession = await loadSessionById(
              serviceUrl,
              session.id,
              ZITADEL_ORGANIZATION
            );

            if (requiresStrongMfaSetupVerification(setupSession)) {
              const verifyUrl = request.nextUrl.clone();
              verifyUrl.pathname = "/mfa/set/verify";
              return NextResponse.redirect(verifyUrl);
            }
          } catch {
            // Let the page-level guard handle failures fetching the enriched session.
          }
        }

        // Allow access to MFA flow pages when password is already verified
        return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
      }
    }

    // Allow access to password pages if session exists
    if (pathname.startsWith("/password")) {
      if (authCheck.session?.factors?.user) {
        return responseWithCSP(NextResponse.next({ request: { headers: requestHeaders } }), csp);
      }
    }
  }

  // Not satisfied and no special case applies - redirect
  const redirectUrl = getSmartRedirect(pathname, authCheck.session || null, searchParams);

  const url = request.nextUrl.clone();
  url.pathname = redirectUrl.split("?")[0];

  // Preserve query params from smart redirect
  if (redirectUrl.includes("?")) {
    const redirectParams = new URLSearchParams(redirectUrl.split("?")[1]);
    redirectParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  return responseWithCSP(NextResponse.redirect(url), csp);
}
