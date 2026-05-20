/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { redirect } from "next/navigation";
import { timestampDate } from "@zitadel/client";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { loadActiveSession, SessionWithAuthData } from "@lib/session";
import { buildUrlWithRequestId } from "@lib/utils";
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
  session: SessionWithAuthData | null;
};

/**
 * Safe wrapper around loadMostRecentSession that returns null instead of throwing
 */
async function getActiveSessionFromCookies() {
  try {
    const session = await loadActiveSession();
    return session || null;
  } catch (error) {
    logMessage.debug({
      error,
      message: "Failed to get session from cookies",
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
  requiredLevel: AuthLevel,
  requestId?: string
): Promise<AuthCheckResult> {
  // Open routes always pass
  if (requiredLevel === AuthLevel.OPEN) {
    return { session: null };
  }

  // Get session from cookies (non-throwing)
  const session = await getActiveSessionFromCookies();
  // Get requestId from session cookie as backup in case it was not passed in
  const requestIdRef = requestId || session?.requestId;

  // Basic session check - just verify cookie exists
  if (requiredLevel === AuthLevel.BASIC_SESSION) {
    if (!session) {
      logMessage.debug(
        `[Authentication Level] Required: ${requiredLevel}, Reason: No session found, Redirecting: "/"`
      );
      return redirect(buildUrlWithRequestId("/", requestIdRef));
    }
    return { session };
  }

  // For password and MFA checks, verify session factors
  const factors = checkSessionFactors(session);

  if (!factors.hasUser || !factors.notExpired) {
    logMessage.debug(
      `[Authentication Level] Required: ${requiredLevel}, Reason: ${factors.hasUser ? "Session expired" : "No user in session"}, Redirecting: "/"`
    );

    return redirect(`/${requestId ? `?requestId:${requestId}` : ""}`);
  }

  // Password required check
  if (requiredLevel === AuthLevel.PASSWORD_REQUIRED) {
    if (!factors.passwordVerified) {
      logMessage.debug(
        `[Authentication Level] Required: ${requiredLevel}, Reason: Password not verified, Redirecting: "/password"`
      );

      return redirect(`/password${requestId ? `?requestId:${requestId}` : ""}`);
    }
    return { session };
  }

  // Any MFA required check
  if (requiredLevel === AuthLevel.ANY_MFA_REQUIRED) {
    if (!factors.passwordVerified) {
      logMessage.debug(
        `[Authentication Level] Required: ${requiredLevel}, Reason: Password not verified, Redirecting: "/password"`
      );

      return redirect(`/password${requestId ? `?requestId:${requestId}` : ""}`);
    }
    if (!hasAnyMFA(session)) {
      logMessage.debug(
        `[Authentication Level] Required: ${requiredLevel}, Reason: MFA not verified, Redirecting: "/password"`
      );

      return redirect(`/mfa${requestId ? `?requestId:${requestId}` : ""}`);
    }

    return { session };
  }

  // Strong MFA required check
  if (requiredLevel === AuthLevel.STRONG_MFA_REQUIRED) {
    if (!factors.passwordVerified) {
      logMessage.debug(
        `[Authentication Level] Required: ${requiredLevel}, Reason: Password not verified, Redirecting: "/password"`
      );

      return redirect(`/password${requestId ? `?requestId:${requestId}` : ""}`);
    }
    if (!hasStrongMFA(session)) {
      logMessage.debug(
        `[Authentication Level] Required: ${requiredLevel}, Reason: Strong MFA not verified, Redirecting: "/password"`
      );

      return redirect(`/mfa${requestId ? `?requestId:${requestId}` : ""}`);
    }
    return { session };
  }
  logMessage.error(
    `[Authentication Level] Required: ${requiredLevel}, Reason: Unknown auth level requested, Redirecting: "/"`
  );
  return redirect(`/${requestId ? `?requestId:${requestId}` : ""}`);
}
