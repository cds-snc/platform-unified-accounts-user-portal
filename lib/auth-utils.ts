/**
 * Authentication utility functions that don't require server actions
 */

/**
 * Validate authentication request parameters
 */
export function validateAuthRequest(searchParams: URLSearchParams): string | null {
  const oidcRequestId = searchParams.get("authRequest");
  const requestId =
    searchParams.get("requestId") ?? (oidcRequestId ? `oidc_${oidcRequestId}` : undefined);
  return requestId || null;
}

/**
 * Check if request is an RSC request
 */
export function isRSCRequest(searchParams: URLSearchParams): boolean {
  return searchParams.has("_rsc");
}
