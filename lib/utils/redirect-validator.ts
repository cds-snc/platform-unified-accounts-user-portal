/**
 * Validates that a redirect URL is safe (relative URL only)
 * Prevents open redirect vulnerabilities by only allowing same-origin redirects
 */
function isValidRelativeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  // Must start with / (relative URL)
  if (!url.startsWith("/")) {
    return false;
  }

  // Must not contain protocol (http://, https://, //)
  if (url.includes("://") || url.startsWith("//")) {
    return false;
  }

  // Additional check: must not be a protocol-relative URL
  if (url.includes("\\")) {
    return false;
  }

  return true;
}

/**
 * Gets a safe redirect URL after validation
 * Returns the redirect if valid, otherwise returns null
 */
export function getSafeRedirectUrl(redirectParam: string | null | undefined): string | null {
  if (isValidRelativeUrl(redirectParam)) {
    return redirectParam as string;
  }
  return null;
}
