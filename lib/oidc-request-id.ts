/**
 * OIDC IDs come in two formats depending on context:
 * - authRequestId: bare Zitadel auth request id (no prefix), used for API calls like createCallback/getAuthRequest
 * - requestId: UI flow id with `oidc_` prefix, used in URLs and app routing
 */

export function toAuthRequestId(value: string): string {
  return value.replace(/^(oidc_)+/, "");
}

export function toOidcRequestId(value: string): string {
  return `oidc_${toAuthRequestId(value)}`;
}
