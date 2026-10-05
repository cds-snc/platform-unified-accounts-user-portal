/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Returns the origin of the AWS WAF JS application integration URL when it's
 * configured and cross-origin relative to this app. Same-origin or relative
 * URLs are already covered by 'self', so they return undefined.
 */
const getWafIntegrationOrigin = (): string | undefined => {
  const wafIntegrationUrl = process.env.NEXT_PUBLIC_WAF_INTEGRATION_URL;

  if (!wafIntegrationUrl) {
    return undefined;
  }

  try {
    return new URL(wafIntegrationUrl).origin;
  } catch {
    return undefined;
  }
};

/**
 * Generates a Content Security Policy header with a nonce for inline scripts and styles.
 *
 * In production, Next.js automatically attaches the nonce to its own inline styles.
 * In development, React devtools and HMR inject styles without nonces, so
 * 'unsafe-inline' is used instead.
 *
 * @see https://nextjs.org/docs/app/guides/content-security-policy
 * @returns Object containing CSP header string and base64-encoded nonce
 */
export const generateCSP = (): { csp: string; nonce: string } => {
  // Generate a random nonce and base64 encode it
  const nonce = Buffer.from(randomUUID()).toString("base64");

  // 'unsafe-eval' is required in development for React's enhanced error overlays
  const isDev = process.env.NODE_ENV === "development";
  const wafIntegrationOrigin = getWafIntegrationOrigin();
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const styleSrc = isDev ? `'self' 'unsafe-inline'` : `'self' 'nonce-${nonce}'`;
  const connectSrc = wafIntegrationOrigin
    ? `'self' hcaptcha.com *.hcaptcha.com ${wafIntegrationOrigin}`
    : `'self' hcaptcha.com *.hcaptcha.com`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc}${wafIntegrationOrigin ? ` ${wafIntegrationOrigin}` : ""};
    style-src ${styleSrc};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src hcaptcha.com *.hcaptcha.com;
    frame-ancestors 'none';
    connect-src ${connectSrc};
    ${isDev ? "" : "upgrade-insecure-requests;"}
  `;

  // Normalize whitespace and return
  return {
    csp: cspHeader.replace(/\s{2,}/g, " ").trim(),
    nonce,
  };
};

export function responseWithCSP(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
