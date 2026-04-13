/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { timestampDate } from "@zitadel/client";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { loadMostRecentSession } from "@lib/session";
/**
 * Authentication levels for route protection
 */
export enum AuthLevel {
  OPEN = "open", // No authentication required
  BASIC_SESSION = "basic_session", // Session cookie must exist
  PASSWORD_REQUIRED = "password_required", // Password factor verified
  ANY_MFA_REQUIRED = "any_mfa_required", // Password + any MFA (TOTP, U2F, or OTP Email)
  STRONG_MFA_REQUIRED = "strong_mfa_required", // Password + strong MFA (TOTP or U2F only)
}

/**
 * Result of authentication level check
 */
type AuthCheckResult = {
  satisfied: boolean;
  session?: Session | null;
  redirect?: string;
  reason?: string;
};

/**
 * Safe wrapper around loadMostRecentSession that returns null instead of throwing
 */
async function getSessionFromCookies(
  serviceUrl: string,
  loginName?: string,
  organization?: string
): Promise<Session | null> {
  try {
    const session = await loadMostRecentSession({
      serviceUrl,
      sessionParams: { loginName, organization },
    });
    return session || null;
  } catch (error) {
    logMessage.debug({
      error,
      message: "Failed to get session from cookies",
      loginName,
      organization,
    });
    return null;
  }
}

/**
 * Check if session has required authentication factors
 */
export function checkSessionFactors(session: Session | null) {
  if (!session) {
    return {
      hasUser: false,
      notExpired: false,
      passwordVerified: false,
      totpVerified: false,
      u2fVerified: false,
      otpEmailVerified: false,
      emailVerified: false,
    };
  }

  const hasUser = !!session.factors?.user?.id;
  const notExpired = session.expirationDate
    ? timestampDate(session.expirationDate).getTime() > new Date().getTime()
    : true;

  const passwordVerified = !!session.factors?.password?.verifiedAt;
  const totpVerified = !!session.factors?.totp?.verifiedAt;
  const u2fVerified = !!session.factors?.webAuthN?.verifiedAt;
  const otpEmailVerified = !!session.factors?.otpEmail?.verifiedAt;

  // Email verification would require fetching user data, skip for now
  const emailVerified = false;

  return {
    hasUser,
    notExpired,
    passwordVerified,
    totpVerified,
    u2fVerified,
    otpEmailVerified,
    emailVerified,
  };
}

/**
 * Check if session has strong MFA (TOTP or U2F)
 */
export function hasStrongMFA(session: Session | null): boolean {
  if (!session) return false;
  const factors = checkSessionFactors(session);
  return factors.totpVerified || factors.u2fVerified;
}

/**
 * Check if session has any MFA (TOTP, U2F, or OTP Email)
 */
export function hasAnyMFA(session: Session | null): boolean {
  if (!session) return false;
  const factors = checkSessionFactors(session);
  return factors.totpVerified || factors.u2fVerified || factors.otpEmailVerified;
}

type SetupProtectionSession = {
  authMethods?: AuthenticationMethodType[];
  factors?: Session["factors"];
};

/**
 * Users who already configured a strong MFA factor must re-verify it before adding more MFA methods.
 */
export function requiresStrongMfaSetupVerification(
  session: SetupProtectionSession | null | undefined
): boolean {
  if (!session) {
    return false;
  }

  const hasConfiguredStrongMFA =
    session.authMethods?.some(
      (method) =>
        method === AuthenticationMethodType.TOTP || method === AuthenticationMethodType.U2F
    ) ?? false;

  if (!hasConfiguredStrongMFA) {
    return false;
  }

  const hasVerifiedStrongMFA =
    !!session.factors?.totp?.verifiedAt || !!session.factors?.webAuthN?.verifiedAt;

  return !hasVerifiedStrongMFA;
}

/**
 * Check if authentication level is satisfied
 */
export async function checkAuthenticationLevel(
  serviceUrl: string,
  requiredLevel: AuthLevel,
  loginName?: string,
  organization?: string
): Promise<AuthCheckResult> {
  // Open routes always pass
  if (requiredLevel === AuthLevel.OPEN) {
    return { satisfied: true };
  }

  // Get session from cookies (non-throwing)
  const session = await getSessionFromCookies(serviceUrl, loginName, organization);

  // Basic session check - just verify cookie exists
  if (requiredLevel === AuthLevel.BASIC_SESSION) {
    if (!session) {
      return {
        satisfied: false,
        redirect: "/",
        reason: "No session found",
      };
    }
    return { satisfied: true, session };
  }

  // For password and MFA checks, verify session factors
  const factors = checkSessionFactors(session);

  if (!factors.hasUser || !factors.notExpired) {
    return {
      satisfied: false,
      session,
      redirect: "/",
      reason: factors.hasUser ? "Session expired" : "No user in session",
    };
  }

  // Password required check
  if (requiredLevel === AuthLevel.PASSWORD_REQUIRED) {
    if (!factors.passwordVerified) {
      return {
        satisfied: false,
        session,
        redirect: "/password",
        reason: "Password not verified",
      };
    }
    return { satisfied: true, session };
  }

  // Any MFA required check
  if (requiredLevel === AuthLevel.ANY_MFA_REQUIRED) {
    if (!factors.passwordVerified) {
      return {
        satisfied: false,
        session,
        redirect: "/password",
        reason: "Password not verified",
      };
    }
    if (!hasAnyMFA(session)) {
      return {
        satisfied: false,
        session,
        redirect: "/mfa",
        reason: "MFA not verified",
      };
    }
    return { satisfied: true, session };
  }

  // Strong MFA required check
  if (requiredLevel === AuthLevel.STRONG_MFA_REQUIRED) {
    if (!factors.passwordVerified) {
      return {
        satisfied: false,
        session,
        redirect: "/password",
        reason: "Password not verified",
      };
    }
    if (!hasStrongMFA(session)) {
      return {
        satisfied: false,
        session,
        redirect: "/mfa",
        reason: "Strong MFA not verified",
      };
    }
    return { satisfied: true, session };
  }

  return { satisfied: false, reason: "Unknown auth level" };
}

/**
 * Get smart redirect URL based on current auth state and destination
 * Preserves requestId and organization params
 */
export function getSmartRedirect(
  destinationPath: string,
  session: Session | null,
  searchParams?: URLSearchParams
): string {
  const factors = checkSessionFactors(session);
  const params = new URLSearchParams();

  // Preserve important params
  if (searchParams) {
    const requestId = searchParams.get("requestId");

    if (requestId) params.set("requestId", requestId);
  }

  // No session at all - go to login
  if (!session || !factors.hasUser || !factors.notExpired) {
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  }

  // Has session but no password - go to password entry
  if (!factors.passwordVerified) {
    const queryString = params.toString();
    return queryString ? `/password?${queryString}` : "/password";
  }

  // Has password but needs MFA for destination - go to MFA check
  if (!hasStrongMFA(session)) {
    const queryString = params.toString();
    return queryString ? `/mfa?${queryString}` : "/mfa";
  }

  // All factors satisfied but still redirecting - something's wrong
  // Fall back to account page as safe destination
  return "/account";
}
