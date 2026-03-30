"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import type { ConnectError } from "@connectrpc/connect";
import { create, Duration } from "@zitadel/client";
import { createUserServiceClient } from "@zitadel/client/v2";
import { Checks, ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
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
  passwordReset,
  setPassword,
  setUserPassword,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { logMessage } from "../../lib/logger";
import { getServiceUrlFromHeaders } from "../../lib/service-url";
import { createServerTransport } from "../../lib/zitadel";
import { completeFlowOrGetUrl } from "../client";
import { getSessionCookieById, getSessionCookieByLoginName } from "../cookies";
import { loadMostRecentSession } from "../session";
import {
  checkEmailVerification,
  checkMFAFactors,
  checkPasswordChangeRequired,
  checkUserVerification,
} from "../verify-helper";

import { getOriginalHostWithProtocol } from "./host";
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
  serviceUrl: string,
  organization: string | undefined,
  t: (key: string, options?: Record<string, string>) => string
): Promise<{ error: string } | null> {
  if (!hasFailedAttempts(error)) {
    return null;
  }

  const lockoutSettings = await getLockoutSettings({
    serviceUrl,
    orgId: organization,
  });

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

type ResetPasswordCommand = {
  loginName: string;
  organization?: string;
  requestId?: string;
};

export async function resetPassword(command: ResetPasswordCommand) {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { t } = await serverTranslation("password");

  // Get the original host that the user sees with protocol
  const hostWithProtocol = await getOriginalHostWithProtocol();

  const users = await listUsers({
    serviceUrl,
    loginName: command.loginName,
    organizationId: command.organization,
  });

  if (!users.details || users.details.totalResult !== BigInt(1) || !users.result[0].userId) {
    return { error: t("errors.couldNotSendResetLink") };
  }
  const userId = users.result[0].userId;

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return passwordReset({
    serviceUrl,
    userId,
    urlTemplate:
      `${hostWithProtocol}${basePath}/password/set?code={{.Code}}&userId={{.UserID}}&organization={{.OrgID}}` +
      (command.requestId ? `&requestId=${command.requestId}` : ""),
  });
}

export type UpdateSessionCommand = {
  loginName: string;
  organization?: string;
  checks: Checks;
  requestId?: string;
};

export async function sendPassword(
  command: UpdateSessionCommand
): Promise<{ error: string } | { redirect: string }> {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const { t } = await serverTranslation("password");

  let sessionCookie = await getSessionCookieByLoginName({
    loginName: command.loginName,
    organization: command.organization,
  }).catch(() => {
    return undefined;
  });

  let session;
  let user: User;
  let loginSettings: LoginSettings | undefined;
  // Capture organization from the cookie before it may be cleared, so the
  // fallback new-session path retains the correct tenant context.
  const cookieOrganization: string | undefined = sessionCookie?.organization;

  if (sessionCookie) {
    loginSettings = await getLoginSettings({
      serviceUrl,
      organization: sessionCookie.organization,
    });

    let lifetime = loginSettings?.passwordCheckLifetime;

    if (!lifetime || !lifetime.seconds) {
      logMessage.warn("No password lifetime provided, defaulting to 24 hours");
      lifetime = {
        seconds: BigInt(60 * 60 * 24), // default to 24 hours
        nanos: 0,
      } as Duration;
    }

    try {
      session = await setSessionAndUpdateCookie({
        recentCookie: sessionCookie,
        checks: command.checks,
        requestId: command.requestId,
        lifetime,
      });
    } catch (error: unknown) {
      // A failed-attempts error means the password was wrong — return the
      // auth failure directly rather than retrying, which would count as a
      // second attempt and could lock the account sooner than intended.
      const authFailure = await handleAuthenticationFailure(
        error,
        serviceUrl,
        command.organization,
        t
      );
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
    const effectiveOrganization = cookieOrganization ?? command.organization;

    loginSettings = await getLoginSettings({
      serviceUrl,
      organization: effectiveOrganization,
    });

    const users = await listUsers({
      serviceUrl,
      loginName: command.loginName,
      organizationId: effectiveOrganization,
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
          lifetime: loginSettings?.passwordCheckLifetime,
        });
      } catch (error: unknown) {
        const authFailure = await handleAuthenticationFailure(
          error,
          serviceUrl,
          effectiveOrganization,
          t
        );
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

  const userResponse = await getUserByID({
    serviceUrl,
    userId: session.factors.user.id,
  });

  if (!userResponse.user) {
    return { error: t("errors.userNotFound") };
  }

  user = userResponse.user;

  if (!loginSettings) {
    loginSettings = await getLoginSettings({
      serviceUrl,
      organization: command.organization ?? session.factors?.user?.organizationId,
    });
  }

  if (!session?.factors?.user?.id) {
    return { error: t("errors.couldNotCreateSessionForUser") };
  }

  const humanUser = user.type.case === "human" ? user.type.value : undefined;

  const expirySettings = await getPasswordExpirySettings({
    serviceUrl,
    orgId: command.organization ?? session.factors?.user?.organizationId,
  });

  // check if the user has to change password first
  const passwordChangedCheck = checkPasswordChangeRequired(
    expirySettings,
    session,
    humanUser,
    command.organization,
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
  const emailVerificationCheck = checkEmailVerification(
    session,
    humanUser,
    command.organization,
    command.requestId
  );

  if (emailVerificationCheck?.redirect) {
    return emailVerificationCheck;
  }

  // if password, check if user has MFA methods
  let authMethods;
  if (command.checks && command.checks.password && session.factors?.user?.id) {
    const response = await listAuthenticationMethodTypes({
      serviceUrl,
      userId: session.factors.user.id,
    });
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
      const result = await completeFlowOrGetUrl(
        {
          sessionId: session.id,
          requestId: command.requestId,
          organization: command.organization ?? session.factors?.user?.organizationId,
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

    const result = await completeFlowOrGetUrl(
      {
        sessionId: session.id,
        loginName: session.factors.user.loginName,
        organization: session.factors?.user?.organizationId,
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

  const mfaFactorCheck = await checkMFAFactors(
    serviceUrl,
    session,
    loginSettings,
    authMethods,
    command.requestId
  );

  if (mfaFactorCheck && "redirect" in mfaFactorCheck) {
    return mfaFactorCheck;
  }

  if (command.requestId && session.id) {
    // OIDC/SAML flow - use completeFlowOrGetUrl for proper handling
    console.log(
      "Password auth: OIDC/SAML flow with requestId:",
      command.requestId,
      "sessionId:",
      session.id
    );
    const result = await completeFlowOrGetUrl(
      {
        sessionId: session.id,
        requestId: command.requestId,
        organization: command.organization ?? session.factors?.user?.organizationId,
      },
      loginSettings?.defaultRedirectUri
    );
    console.log("Password auth: OIDC/SAML flow result:", result);

    // Safety net - ensure we always return a valid object
    if (
      !result ||
      typeof result !== "object" ||
      (!("redirect" in result) && !("error" in result))
    ) {
      console.error("Password auth: Invalid result from completeFlowOrGetUrl (OIDC/SAML):", result);
      return { error: "Authentication completed but navigation failed" };
    }

    return result;
  }

  // Regular flow (no requestId) - return URL for client-side navigation
  console.log("Password auth: Regular flow with loginName:", session.factors.user.loginName);
  const result = await completeFlowOrGetUrl(
    {
      loginName: session.factors.user.loginName,
      organization: session.factors?.user?.organizationId,
    },
    loginSettings?.defaultRedirectUri
  );
  console.log("Password auth: Regular flow result:", result);

  // Safety net - ensure we always return a valid object
  if (!result || typeof result !== "object" || (!("redirect" in result) && !("error" in result))) {
    console.error("Password auth: Invalid result from completeFlowOrGetUrl:", result);
    return { error: "Authentication completed but navigation failed" };
  }

  return result;
}

// this function lets users with code set a password or users with valid User Verification Check
export async function changePassword(command: { code?: string; userId: string; password: string }) {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const { t } = await serverTranslation("password");
  const normalizedCode = command.code?.replace(/\s+/g, "").trim();

  if (!command.userId?.trim()) {
    return { error: t("errors.couldNotResetPassword") };
  }

  // check for init state
  const userResponse = await getUserByID({
    serviceUrl,
    userId: command.userId,
  }).catch(() => undefined);

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
    const authmethods = await listAuthenticationMethodTypes({
      serviceUrl,
      userId,
    });

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
    const session = await loadMostRecentSession({
      serviceUrl,
      sessionParams: {
        loginName: user.preferredLoginName,
        organization: user.details?.resourceOwner,
      },
    }).catch(() => undefined);

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
      serviceUrl,
      userId,
      password: command.password,
      code: normalizedCode,
    });

    // Send password changed email notification
    if (didPasswordChangeSucceed(result)) {
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
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const { t } = await serverTranslation("password");

  let sessionCookie;
  try {
    sessionCookie = await getSessionCookieById({ sessionId });
  } catch (error) {
    console.error("Error getting session cookie:", error);
    return { error: "Could not load session cookie" };
  }

  let session;
  try {
    const sessionResponse = await getSession({
      serviceUrl,
      sessionId: sessionCookie.id,
      sessionToken: sessionCookie.token,
    });
    session = sessionResponse.session;
  } catch (error) {
    console.error("Error getting session:", error);
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
    authmethods = await listAuthenticationMethodTypes({
      serviceUrl,
      userId: session.factors.user.id,
    });
  } catch (error) {
    console.error("Error getting auth methods:", error);
    return { error: "Could not load auth methods" };
  }

  if (!authmethods) {
    return { error: t("errors.couldNotLoadAuthMethods") };
  }

  let loginSettings;
  try {
    loginSettings = await getLoginSettings({
      serviceUrl,
      organization: session.factors.user.organizationId,
    });
  } catch (error) {
    console.error("Error getting login settings:", error);
    return { error: "Could not load login settings" };
  }

  const forceMfa = !!(loginSettings?.forceMfa || loginSettings?.forceMfaLocalOnly);

  // if the user has no MFA but MFA is enforced, we can set a password otherwise we use the token of the user
  if (forceMfa) {
    console.log(
      "Set password using service account due to enforced MFA without existing MFA methods"
    );
    return setPassword({ serviceUrl, payload })
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
  } else {
    const transport = async (serviceUrl: string, token: string) => {
      return createServerTransport(token, serviceUrl);
    };

    const myUserService = async (serviceUrl: string, sessionToken: string) => {
      const transportPromise = await transport(serviceUrl, sessionToken);
      return createUserServiceClient(transportPromise);
    };

    const selfService = await myUserService(serviceUrl, `${sessionCookie.token}`);

    return selfService
      .setPassword(
        {
          userId: session.factors.user.id,
          newPassword: { password, changeRequired: false },
        },
        {}
      )
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
      .catch((error: ConnectError) => {
        console.log(error);
        if (error.code === 7) {
          return { error: t("errors.sessionNotValid") };
        }
        return { error: "Could not set the password" };
      });
  }
}
