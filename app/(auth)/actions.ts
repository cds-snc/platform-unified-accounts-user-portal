"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookie, CreateSessionFailedError } from "@lib/server/cookie";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { buildUrlWithRequestId } from "@lib/utils";
import { validateUsernameAndPassword } from "@lib/validationSchemas";
import { checkEmailVerification, checkMFAFactors } from "@lib/verify-helper";
import {
  // getOrgsByDomain,
  getLockoutSettings,
  getLoginSettings,
  getUserByID,
  listAuthenticationMethodTypes,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
// import { ZITADEL_ORGANIZATION } from "@root/constants/config";

// const ORG_SUFFIX_REGEX = /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

export type SubmitLoginCommand = {
  username: string;
  password: string;
  requestId?: string;
  organization?: string;
};

/**
 * Handles combined username + password login in a single step
 * Returns generic error messages to prevent username enumeration
 */
export const submitLoginForm = async (
  command: SubmitLoginCommand
): Promise<{ error: string } | { redirect: string }> => {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { t } = await serverTranslation("start");

  const validationResult = await validateUsernameAndPassword(command);

  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for username and password");
    return {
      error: t("validation.invalidCredentials"),
    };
  }

  // Get login settings for organization context
  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization: command.organization,
  });

  if (!loginSettings) {
    logMessage.error("Could not load login settings");
    return { error: t("validation.invalidCredentials") };
  }

  // Create session with combined username + password check
  const checks = create(ChecksSchema, {
    user: { search: { case: "loginName", value: command.username } },
    password: { password: command.password },
  });

  let session;

  try {
    session = await createSessionAndUpdateCookie({
      checks,
      requestId: command.requestId,
      lifetime: loginSettings?.passwordCheckLifetime,
    });
  } catch (error: unknown) {
    // Handle authentication failures with generic error message
    // This prevents username enumeration attacks
    const errorDetail = error as CreateSessionFailedError;

    // Log failed attempt count if available (for monitoring)
    if ("failedAttempts" in errorDetail && errorDetail.failedAttempts) {
      const lockoutSettings = await getLockoutSettings({
        serviceUrl,
        orgId: command.organization,
      });

      logMessage.warn(
        `Login failed - Attempt ${errorDetail.failedAttempts}${lockoutSettings?.maxPasswordAttempts ? ` of ${lockoutSettings.maxPasswordAttempts}` : ""}`
      );

      // Check if account is locked
      const hasLimit =
        lockoutSettings?.maxPasswordAttempts !== undefined &&
        lockoutSettings?.maxPasswordAttempts > BigInt(0);
      const locked = hasLimit && errorDetail.failedAttempts >= lockoutSettings?.maxPasswordAttempts;

      if (locked) {
        logMessage.error("Account locked due to too many failed attempts");
      }
    }

    // Always return generic error (don't reveal if user exists or password is wrong)
    logMessage.info("Authentication failed, returning generic message");
    return { error: t("validation.invalidCredentials") };
  }

  if (!session?.factors?.user?.id) {
    logMessage.error("Session created but no user ID found");
    return { error: t("validation.invalidCredentials") };
  }

  // Fetch user details
  const userResponse = await getUserByID({
    serviceUrl,
    userId: session.factors.user.id,
  });

  if (!userResponse.user) {
    logMessage.error("User not found after successful authentication");
    return { error: t("validation.invalidCredentials") };
  }

  const user = userResponse.user;
  const humanUser = user.type.case === "human" ? user.type.value : undefined;

  // Check if user is in initial state (not supported)
  if (user.state === UserState.INITIAL) {
    logMessage.error("User in INITIAL state - not supported");
    return { error: t("validation.invalidCredentials") };
  }

  // Check email verification status
  const emailVerificationCheck = checkEmailVerification(
    session,
    humanUser,
    command.organization,
    command.requestId
  );

  if (emailVerificationCheck?.redirect) {
    return emailVerificationCheck;
  }

  // Get authentication methods for MFA check
  const response = await listAuthenticationMethodTypes({
    serviceUrl,
    userId: session.factors.user.id,
  });

  const authMethods = response.authMethodTypes ?? [];

  if (authMethods.length === 0) {
    logMessage.error("No authentication methods found for user");
    return { error: t("validation.invalidCredentials") };
  }

  // Check MFA requirements and redirect appropriately
  const mfaFactorCheck = await checkMFAFactors(
    serviceUrl,
    session,
    loginSettings,
    authMethods,
    command.requestId
  );

  if ("error" in mfaFactorCheck) {
    logMessage.error(`MFA factor check failed: ${mfaFactorCheck.error}`);
    return { error: t("validation.invalidCredentials") };
  }

  if ("redirect" in mfaFactorCheck) {
    return mfaFactorCheck;
  }

  // If no MFA redirect, authentication is complete
  logMessage.info("Login successful, redirecting to account page");
  return { redirect: buildUrlWithRequestId("/account", command.requestId) };
};
