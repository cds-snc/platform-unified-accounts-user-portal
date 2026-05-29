"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { Checks, ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { User, UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { SetPasswordRequestSchema } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { createSessionAndUpdateCookie, setSessionAndUpdateCookie } from "@lib/server/cookie";
import { hasStrongMFA } from "@lib/server/route-protection";
import {
  getLockoutSettings,
  getLoginSettings,
  getPasswordExpirySettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
  listUsers,
  setPassword,
  setUserPassword,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { logMessage } from "../../lib/logger";
import { getSessionCookieById, getSessionCookieByLoginName } from "../cookies";
import { loadActiveSession } from "../session";
import {
  checkEmailVerification,
  checkMFAFactors,
  checkPasswordChangeRequired,
  checkUserVerification,
} from "../verify-helper";

import { completeFlowAndRedirect } from "./auth-flow";
import { sendPasswordChangedEmail } from "./verify";

/**
 * Type guard to check if an error has failedAttempts property
 */
function hasFailedAttempts(error: unknown): error is { failedAttempts: bigint } {
  return (
    error !== null &&
    typeof error === "object" &&
    "failedAttempts" in error &&
    typeof error.failedAttempts === "bigint"
  );
}

function didPasswordChangeSucceed(result: unknown): boolean {
  if (!result || typeof result !== "object") {
    return false;
  }

  if ("error" in result) {
    return false;
  }

  if (!("details" in result)) {
    return false;
  }

  const details = result.details;
  if (!details || typeof details !== "object") {
    return false;
  }

  return "changeDate" in details;
}

/**
 * Helper function to handle authentication failure errors with lockout settings
 */
async function handleAuthenticationFailure(
  error: unknown,
  t: (key: string, options?: Record<string, string>) => string
): Promise<{ error: string } | null> {
  if (!hasFailedAttempts(error)) {
    return null;
  }

  const lockoutSettings = await getLockoutSettings();

  const hasLimit =
    lockoutSettings?.maxPasswordAttempts !== undefined &&
    lockoutSettings?.maxPasswordAttempts > BigInt(0);
  const locked = hasLimit && error.failedAttempts >= lockoutSettings?.maxPasswordAttempts;
  const messageKey = hasLimit
    ? "errors.failedToAuthenticate"
    : "errors.failedToAuthenticateNoLimit";

  return {
    error: t(messageKey, {
      failedAttempts: error.failedAttempts.toString(),
      maxPasswordAttempts: hasLimit ? lockoutSettings?.maxPasswordAttempts.toString() : "?",
      lockoutMessage: locked ? t("errors.accountLockedContactAdmin") : "",
    }),
  };
}

type UpdateSessionCommand = {
  loginName: string;
  checks: Checks;
  requestId?: string;
};

export async function sendPassword(
  command: UpdateSessionCommand
): Promise<{ error: string } | { redirect: string }> {
  const { t } = await serverTranslation("password");

  let sessionCookie = await getSessionCookieByLoginName({
    loginName: command.loginName,
  }).catch(() => {
    return undefined;
  });

  let session;
  let user: User;
  const loginSettings = await getLoginSettings();
  if (sessionCookie) {
    try {
      session = await setSessionAndUpdateCookie({
        activeCookie: sessionCookie,
        checks: command.checks,
        requestId: command.requestId,
      });
    } catch (error: unknown) {
      // A failed-attempts error means the password was wrong — return the
      // auth failure directly rather than retrying, which would count as a
      // second attempt and could lock the account sooner than intended.
      const authFailure = await handleAuthenticationFailure(error, t);
      if (authFailure) {
        return authFailure;
      }

      logMessage.warn("Could not update existing session; falling back to creating a new session.");
      // Any other error (e.g. session expired on Zitadel's side) is treated as
      // a signal to abandon the stale cookie and create a fresh session below.
      sessionCookie = undefined;
      session = undefined;
    }
  }

  if (!sessionCookie) {
    const users = await listUsers({
      loginName: command.loginName,
    });

    if (users.details?.totalResult == BigInt(1) && users.result[0].userId) {
      user = users.result[0];

      const checks = create(ChecksSchema, {
        user: { search: { case: "userId", value: users.result[0].userId } },
        password: { password: command.checks.password?.password },
      });

      try {
        session = await createSessionAndUpdateCookie({
          checks,
          requestId: command.requestId,
        });
      } catch (error: unknown) {
        const authFailure = await handleAuthenticationFailure(error, t);
        if (authFailure) {
          return authFailure;
        }
        return { error: t("errors.couldNotCreateSessionForUser") };
      }
    } else {
      // this is a fake error message to hide that the user does not even exist
      return { error: "Could not verify password" };
    }
  }

  if (!session?.factors?.user?.id) {
    return { error: t("errors.couldNotCreateSessionForUser") };
  }

  const userResponse = await getUserByID(session.factors.user.id);

  if (!userResponse.user) {
    return { error: t("errors.userNotFound") };
  }

  user = userResponse.user;

  if (!session?.factors?.user?.id) {
    return { error: t("errors.couldNotCreateSessionForUser") };
  }

  const humanUser = user.type.case === "human" ? user.type.value : undefined;

  const expirySettings = await getPasswordExpirySettings();

  // check if the user has to change password first
  const passwordChangedCheck = checkPasswordChangeRequired(
    expirySettings,
    session,
    humanUser,
    command.requestId
  );

  if (passwordChangedCheck?.redirect) {
    return passwordChangedCheck;
  }

  // throw error if user is in initial state here and do not continue
  if (user.state === UserState.INITIAL) {
    return { error: t("errors.initialUserNotSupported") };
  }

  // check to see if user was verified
  const emailVerificationCheck = checkEmailVerification(session, humanUser, command.requestId);

  if (emailVerificationCheck?.redirect) {
    return emailVerificationCheck;
  }

  // if password, check if user has MFA methods
  let authMethods;
  if (command.checks && command.checks.password && session.factors?.user?.id) {
    const response = await listAuthenticationMethodTypes(session.factors.user.id);
    if (response.authMethodTypes && response.authMethodTypes.length) {
      authMethods = response.authMethodTypes;
    }
  }

  if (!authMethods) {
    return { error: t("errors.couldNotVerifyPassword") };
  }

  // Recovery MFA may already be satisfied on the current session, so avoid
  // forcing the user back through a second MFA prompt after they set a new password.
  if (hasStrongMFA(session)) {
    if (command.requestId && session.id) {
      const result = await completeFlowAndRedirect(
        {
          sessionId: session.id,
          requestId: command.requestId,
        },
        loginSettings?.defaultRedirectUri
      );

      if (
        !result ||
        typeof result !== "object" ||
        (!("redirect" in result) && !("error" in result))
      ) {
        return { error: "Authentication completed but navigation failed" };
      }

      return result;
    }

    const result = await completeFlowAndRedirect(
      {
        sessionId: session.id,
        loginName: session.factors.user.loginName,
      },
      loginSettings?.defaultRedirectUri
    );

    if (
      !result ||
      typeof result !== "object" ||
      (!("redirect" in result) && !("error" in result))
    ) {
      return { error: "Authentication completed but navigation failed" };
    }

    return result;
  }

  const mfaFactorCheck = await checkMFAFactors(authMethods, command.requestId);

  if (mfaFactorCheck && "redirect" in mfaFactorCheck) {
    return mfaFactorCheck;
  }

  if (command.requestId && session.id) {
    // OIDC flow - use completeFlowOrGetUrl for proper handling
    logMessage.debug({
      message: "Password auth: OIDC flow with requestId",
      requestId: command.requestId,
      sessionId: session.id,
    });
    const result = await completeFlowAndRedirect(
      {
        sessionId: session.id,
        requestId: command.requestId,
      },
      loginSettings?.defaultRedirectUri
    );
    logMessage.debug({
      message: "Password auth: OIDC flow result",
      result,
    });

    // Safety net - ensure we always return a valid object
    if (
      !result ||
      typeof result !== "object" ||
      (!("redirect" in result) && !("error" in result))
    ) {
      logMessage.error("Password auth: Invalid result from completeFlowOrGetUrl (OIDC)", result);
      return { error: "Authentication completed but navigation failed" };
    }

    return result;
  }

  // Regular flow (no requestId) - return URL for client-side navigation
  logMessage.debug("Password auth: completing regular flow");
  const result = await completeFlowAndRedirect(
    {
      loginName: session.factors.user.loginName,
    },
    loginSettings?.defaultRedirectUri
  );

  // Safety net - ensure we always return a valid object
  if (!result || typeof result !== "object" || (!("redirect" in result) && !("error" in result))) {
    logMessage.error("Password auth: Invalid result from completeFlowOrGetUrl");
    return { error: "Authentication completed but navigation failed" };
  }

  return result;
}

// this function lets users with code set a password or users with valid User Verification Check
export async function changePassword(command: { code?: string; userId: string; password: string }) {
  const { t } = await serverTranslation("password");
  const normalizedCode = command.code?.replace(/\s+/g, "").trim();

  if (!command.userId?.trim()) {
    return { error: t("errors.couldNotResetPassword") };
  }

  // check for init state
  const userResponse = await getUserByID(command.userId).catch(() => undefined);

  const user = userResponse?.user;

  if (!user || user.userId !== command.userId) {
    return { error: t("errors.couldNotResetPassword") };
  }
  const userId = user.userId;

  if (user.state === UserState.INITIAL) {
    return { error: t("errors.userInitialStateNotSupported") };
  }

  // check if the user has no password set in order to set a password
  if (!normalizedCode) {
    const authmethods = await listAuthenticationMethodTypes(userId);

    // if the user has no authmethods set, we need to check if the user was verified
    if (authmethods.authMethodTypes.length !== 0) {
      return {
        error: t("errors.codeOrVerificationRequired"),
      };
    }

    // check if a verification was done earlier
    const hasValidUserVerificationCheck = await checkUserVerification(user.userId);

    if (!hasValidUserVerificationCheck) {
      return { error: t("errors.verificationRequired") };
    }
  }

  // A reset code is only accepted when it is paired with the same browser session
  // that just completed a strong recovery factor for this user.
  if (normalizedCode) {
    const session = await loadActiveSession().catch(() => undefined);

    if (
      !session?.factors?.user?.id ||
      session.factors.user.id !== userId ||
      !hasStrongMFA(session)
    ) {
      return { error: t("errors.strongMfaRequiredForReset") };
    }
  }

  try {
    const result = await setUserPassword({
      userId,
      password: command.password,
      code: normalizedCode,
    });

    // Send password changed email notification
    if (didPasswordChangeSucceed(result)) {
      logMessage.info("Password changed successfully");
      await sendPasswordChangedEmail({ userId }).catch((error) => {
        logMessage.debug({
          error: error instanceof Error ? error.message : error,
          message: "Failed to send password changed email",
        });
        // Don't fail the password change if email fails
      });
    }

    return result;
  } catch (error) {
    logMessage.debug({
      message: "Failed to change password",
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: t("errors.couldNotResetPassword") };
  }
}

type CheckSessionAndSetPasswordCommand = {
  sessionId: string;
  password: string;
};

export async function checkSessionAndSetPassword({
  sessionId,
  password,
}: CheckSessionAndSetPasswordCommand) {
  const { t } = await serverTranslation("password");

  let sessionCookie;
  try {
    sessionCookie = await getSessionCookieById({ sessionId });
  } catch (error) {
    logMessage.error("Could not load session cookie", error);
    return { error: "Could not load session cookie" };
  }

  let session;
  try {
    const sessionResponse = await getSession(sessionCookie.id, sessionCookie.token);
    session = sessionResponse.session;
  } catch (error) {
    logMessage.error("Could not load session", error);
    return { error: "Could not load session" };
  }

  if (!session || !session.factors?.user?.id) {
    return { error: t("errors.couldNotLoadSession") };
  }

  const payload = create(SetPasswordRequestSchema, {
    userId: session.factors.user.id,
    newPassword: {
      password,
    },
  });

  // check if the user has no password set in order to set a password
  let authmethods;
  try {
    authmethods = await listAuthenticationMethodTypes(session.factors.user.id);
  } catch (error) {
    logMessage.error("Could not load auth methods", error);
    return { error: "Could not load auth methods" };
  }

  if (!authmethods) {
    return { error: t("errors.couldNotLoadAuthMethods") };
  }

  logMessage.info(
    "Setting password via service account due to enforced MFA without existing MFA methods"
  );
  return setPassword({ payload })
    .then(async (result) => {
      // Send password changed email notification
      if (didPasswordChangeSucceed(result)) {
        await sendPasswordChangedEmail({ userId: session.factors!.user!.id }).catch((error) => {
          logMessage.debug({
            error: error instanceof Error ? error.message : error,
            message: "Failed to send password changed email",
          });
          // Don't fail the password change if email fails
        });
      }
      return result;
    })
    .catch((error) => {
      // throw error if failed precondition (ex. User is not yet initialized)
      if (error.code === 9 && error.message) {
        return { error: t("errors.failedPrecondition") };
      }
      return { error: "Could not set password" };
    });
}
