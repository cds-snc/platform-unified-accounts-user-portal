/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const styleSrc = isDev ? `'self' 'unsafe-inline'` : `'self' 'nonce-${nonce}'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src ${styleSrc};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self';
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
