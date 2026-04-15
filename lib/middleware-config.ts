/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { AuthLevel } from "./server/route-protection";
/**
 * Route patterns mapped to their required authentication levels
 */
const ROUTE_PATTERNS: Record<string, AuthLevel> = {
  // Account management - requires full authentication with any MFA factor
  "/account": AuthLevel.ANY_MFA_REQUIRED,

  // Password change - requires password to be verified
  "/password/change": AuthLevel.PASSWORD_REQUIRED,

  // MFA selection (during auth flow) - requires password
  "/mfa": AuthLevel.PASSWORD_REQUIRED,

  // Email verification (during auth flow) - requires password
  "/verify": AuthLevel.PASSWORD_REQUIRED,

  // Password entry - requires basic session
  "/password": AuthLevel.BASIC_SESSION,

  // Verify success page - requires password verification
  "/verify/success": AuthLevel.PASSWORD_REQUIRED,

  "/password/reset": AuthLevel.OPEN,

  // OTP pages - require password verification
  "/otp": AuthLevel.PASSWORD_REQUIRED,

  // U2F pages - require password verification
  "/u2f": AuthLevel.PASSWORD_REQUIRED,

  // MFA setup - requires password verification
  "/mfa/set": AuthLevel.PASSWORD_REQUIRED,

  // Completion page - requires password verification
  "/all-set": AuthLevel.PASSWORD_REQUIRED,
};

/**
 * Fully open routes - no authentication required
 */
const PUBLIC_ROUTES = [
  "/", // Login/username entry
  "/login", // OIDC initiation
  "/register", // User registratio (accessed via email link with userId)
  "/healthy", // Health check
  "/security", // Security settings (cached)
  "/error", // Error pages
];

/**
 * Routes that are part of multi-step authentication flows
 * These routes may need special handling to preserve flow state
 */
export const AUTH_FLOW_ROUTES = [
  "/password",
  "/password/reset",
  "/mfa",
  "/mfa/set",
  "/otp/time-based",
  "/otp/time-based/set",
  "/otp/email",
  "/otp/email/set",
  "/u2f",
  "/u2f/set",
  "/verify",
];

/**
 * API routes that should not be processed by auth middleware
 * (Static assets and Next.js internals are already excluded by matcher)
 */
export const API_ROUTES = ["/healthy", "/security", "/login"];

/**
 * Check if a pathname matches any pattern in a list
 */
export function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      // Wildcard match
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return pathname === pattern || pathname.startsWith(pattern + "/");
  });
}

/**
 * Get the required authentication level for a given pathname
 * Returns AuthLevel.OPEN for public routes
 */
export function getRequiredAuthLevel(pathname: string): AuthLevel {
  // Check if it's a public route
  if (matchesPattern(pathname, PUBLIC_ROUTES)) {
    return AuthLevel.OPEN;
  }

  // Check exact matches first
  if (pathname in ROUTE_PATTERNS) {
    return ROUTE_PATTERNS[pathname];
  }

  // Check for prefix matches (e.g., /account/settings matches /account)
  for (const [pattern, level] of Object.entries(ROUTE_PATTERNS)) {
    if (pathname.startsWith(pattern + "/")) {
      return level;
    }
  }

  // Default to open for unmatched routes
  // In production, you might want to default to BASIC_SESSION for safety
  return AuthLevel.OPEN;
}
