"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { create } from "@zitadel/client";
import { UpdateHumanUserRequestSchema } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthenticatedAction, type SessionCredentials } from "@lib/actions/authenticated";
import { logMessage } from "@lib/logger";
import { validateSessionCredentials, validateUserCanAccessUserId } from "@lib/server/session-utils";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import * as z from "@lib/zitadel";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import "server-only";
/**
 * Protected wrapper for getUserByID.
 * Ensures user can only access their own profile data.
 *
 * @security Requires authenticated session. Verifies userId matches authenticated user.
 */
export const protectedGetUserByID = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to access userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.getUserByID({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to get user ${userId}`, error);
      return { error: "Failed to retrieve user" };
    }
  }
);

/**
 * Protected wrapper for listIDPLinks.
 * Ensures user can only list their own linked external IDPs.
 *
 * @security Requires authenticated session. Verifies userId matches authenticated user.
 */
export const protectedListIDPLinks = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to list IDP links for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.listIDPLinks({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to list IDP links for ${userId}`, error);
      return { error: "Failed to list IDP links" };
    }
  }
);

/**
 * Protected wrapper for registerTOTP.
 * Ensures user can only register TOTP for their own account.
 *
 * @security Requires authenticated session. This endpoint returns cryptographic secret material.
 */
export const protectedRegisterTOTP = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to register TOTP for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.registerTOTP({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to register TOTP for ${userId}`, error);
      return { error: "Failed to register TOTP" };
    }
  }
);

/**
 * Protected wrapper for verifyTOTPRegistration.
 * Ensures user can only verify TOTP registration for their own account.
 *
 * @security Requires authenticated session. Verifies the code matches TOTP secret.
 */
export const protectedVerifyTOTPRegistration = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string, code: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to verify TOTP for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.verifyTOTPRegistration({ serviceUrl, userId, code });
    } catch (error) {
      logMessage.error(`Failed to verify TOTP for ${userId}`, error);
      return { error: "Failed to verify TOTP" };
    }
  }
);

/**
 * Protected wrapper for addOTPEmail.
 * Ensures user can only enable OTP email for their own account.
 *
 * @security Requires authenticated session. OTP credentials are sensitive.
 */
export const protectedAddOTPEmail = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to add OTP email for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.addOTPEmail({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to add OTP email for ${userId}`, error);
      return { error: "Failed to add OTP email" };
    }
  }
);

/**
 * Protected wrapper for addOTPSMS.
 * Ensures user can only enable OTP SMS for their own account.
 *
 * @security Requires authenticated session. OTP credentials are sensitive.
 */
export const protectedAddOTPSMS = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to add OTP SMS for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.addOTPSMS({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to add OTP SMS for ${userId}`, error);
      return { error: "Failed to add OTP SMS" };
    }
  }
);

/**
 * Protected wrapper for registerU2F.
 * Ensures user can only register U2F devices on their own account.
 *
 * @security Requires authenticated session. Returns cryptographic challenge data.
 */
export const protectedRegisterU2F = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string, domain: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to register U2F for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.registerU2F({ serviceUrl, userId, domain });
    } catch (error) {
      logMessage.error(`Failed to register U2F for ${userId}`, error);
      return { error: "Failed to register U2F" };
    }
  }
);

/**
 * Protected wrapper for verifyU2FRegistration.
 * Ensures user can only verify U2F registration for their own account.
 *
 * @security Requires authenticated session. Verifies device challenge response.
 */
export const protectedVerifyU2FRegistration = AuthenticatedAction(
  async (
    credentials: SessionCredentials,
    userId: string,
    request: z.VerifyU2FRegistrationRequest
  ) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to verify U2F for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    // Ensure request references the authenticated user
    if (request.userId !== userId) {
      logMessage.warn(
        `U2F verification userId mismatch: request ${request.userId} vs authenticated ${userId}`
      );
      return { error: "Invalid request" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.verifyU2FRegistration({ serviceUrl, request });
    } catch (error) {
      logMessage.error(`Failed to verify U2F for ${userId}`, error);
      return { error: "Failed to verify U2F" };
    }
  }
);

/**
 * Protected wrapper for removeU2F.
 * Ensures user can only remove their own U2F devices.
 *
 * @security Requires authenticated session. Removing MFA devices is sensitive.
 */
export const protectedRemoveU2F = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string, u2fId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to remove U2F for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.removeU2F({ serviceUrl, userId, u2fId });
    } catch (error) {
      logMessage.error(`Failed to remove U2F for ${userId}`, error);
      return { error: "Failed to remove U2F" };
    }
  }
);

/**
 * Protected wrapper for removeTOTP.
 * Ensures user can only remove TOTP from their own account.
 *
 * @security Requires authenticated session. Removing MFA methods is sensitive.
 */
export const protectedRemoveTOTP = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to remove TOTP for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.removeTOTP({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to remove TOTP for ${userId}`, error);
      return { error: "Failed to remove TOTP" };
    }
  }
);

/**
 * Protected wrapper for getTOTPStatus.
 * Ensures user can only check TOTP status for their own account.
 *
 * @security Requires authenticated session. Reveals whether MFA is enabled.
 */
export const protectedGetTOTPStatus = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to check TOTP status for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.getTOTPStatus({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to get TOTP status for ${userId}`, error);
      return { error: "Failed to get TOTP status" };
    }
  }
);

/**
 * Protected wrapper for getU2FList.
 * Ensures user can only list their own registered U2F devices.
 *
 * @security Requires authenticated session. Device list is sensitive metadata.
 */
export const protectedGetU2FList = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to list U2F devices for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.getU2FList({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to get U2F list for ${userId}`, error);
      return { error: "Failed to get U2F list" };
    }
  }
);

/**
 * Protected wrapper for listAuthenticationMethodTypes.
 * Ensures user can only list auth methods for their own account.
 *
 * @security Requires authenticated session. Auth method list is sensitive.
 */
export const protectedListAuthenticationMethodTypes = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to list auth methods for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.listAuthenticationMethodTypes({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to list auth methods for ${userId}`, error);
      return { error: "Failed to list auth methods" };
    }
  }
);

/**
 * Protected wrapper for humanMFAInitSkipped.
 * Marks MFA initialization as skipped for user in Zitadel.
 *
 * @security Requires authenticated session. Verifies the action is on the authenticated user only.
 */
export const protectedHumanMFAInitSkipped = AuthenticatedAction(
  async (credentials: SessionCredentials, userId: string) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to mark MFA init skipped for userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.humanMFAInitSkipped({ serviceUrl, userId });
    } catch (error) {
      logMessage.error(`Failed to mark MFA init skipped for ${userId}`, error);
      return { error: "Failed to mark MFA init skipped" };
    }
  }
);

/**
 * Protected wrapper for addIDPLink.
 * Ensures user can only link external IDPs to their own account.
 *
 * @security Requires authenticated session. Links untrusted external identity providers.
 */
export const protectedAddIDPLink = AuthenticatedAction(
  async (
    credentials: SessionCredentials,
    userId: string,
    idp: { id: string; userId: string; userName: string }
  ) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to add IDP link to userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.addIDPLink({ serviceUrl, idp, userId });
    } catch (error) {
      logMessage.error(`Failed to add IDP link for ${userId}`, error);
      return { error: "Failed to add IDP link" };
    }
  }
);

/**
 * Protected wrapper for getPasswordExpirySettings.
 * Retrieves password expiry policy - public settings but passed through auth wrapper for consistency.
 *
 * @security Requires authenticated session for audit/logging purposes.
 */
export const protectedGetPasswordExpirySettings = AuthenticatedAction(
  async (credentials: SessionCredentials) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      return await z.getPasswordExpirySettings({
        serviceUrl,
        orgId: credentials.organization,
      });
    } catch (error) {
      logMessage.error("Failed to get password expiry settings", error);
      return { error: "Failed to get password expiry settings" };
    }
  }
);

/**
 * Protected wrapper for protectedUpdatePersonalDetails.
 * Ensures user can only update their own profile data.
 *
 * @security Requires authenticated session. Verifies userId matches authenticated user.
 */
export const protectedUpdatePersonalDetails = AuthenticatedAction(
  async (
    credentials: SessionCredentials,
    userId: string,
    account: { firstName: string; lastName: string }
  ) => {
    if (!validateSessionCredentials(credentials)) {
      return { error: "Invalid session credentials" };
    }

    if (!validateUserCanAccessUserId(credentials.userId, userId)) {
      logMessage.warn(
        `Unauthorized attempt to update userId ${userId} by user ${credentials.loginName}`
      );
      return { error: "Unauthorized" };
    }

    try {
      const _headers = await headers();
      const { serviceUrl } = getServiceUrlFromHeaders(_headers);
      const request = create(UpdateHumanUserRequestSchema, {
        userId,
        profile: {
          givenName: account.firstName,
          familyName: account.lastName,
          displayName: `${account.firstName} ${account.lastName}`,
        },
        // Note: leaving here for reference encase we want to update the username as well
        // email: {
        //   email: account.email,
        // },
        // username: account.email,
      });
      return await z.updateHuman({ serviceUrl, request });
    } catch (error) {
      logMessage.error(`Failed to update user ${userId}`, error);
      return { error: "Failed to update user" };
    }
  }
);
