"use server";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { create } from "@zitadel/client";
import { UpdateHumanUserRequestSchema } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { logoutCurrentSession } from "@lib/server/session";
import { SessionWithAuthData } from "@lib/session";
import { validatePersonalDetails, validateU2fId } from "@lib/validation/validationSchemas";
import { getU2FList, removeTOTP, removeU2F, updateHuman } from "@lib/zitadel";

export const removeU2FAction = AuthenticatedAction(async (session, u2fId: string) => {
  const validationResult = validateU2fId(u2fId);
  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for u2fId");
    throw new Error("Invalid parameters");
  }

  const userId = session.factors.user.id;

  const hasMultipleMFA = await _hasMultipleMFAMethods(session);
  if (!hasMultipleMFA) {
    return {
      error:
        "Cannot remove security key. At least one strong authentication method must be configured to remove one.",
    };
  }

  const result = await removeU2F({ userId, u2fId }).catch((e) => {
    logMessage.error(`Failed to remove U2F for ${userId}`, e);
    return { error: "Failed to remove U2F" };
  });

  if ("error" in result) {
    return result;
  }

  revalidatePath("/account");
  return { success: true };
});

export const removeTOTPAction = AuthenticatedAction(async (session) => {
  const userId = session.factors.user.id;
  const hasMultipleMFA = await _hasMultipleMFAMethods(session);
  if (!hasMultipleMFA) {
    return {
      error:
        "Cannot remove authenticator. At least one strong authentication methods must be configured to remove one.",
    };
  }

  const result = await removeTOTP({ userId }).catch((e) => {
    logMessage.error("Failed to remove TOTP", e);
    return { error: "Failed to remove Authentication method" };
  });
  if ("error" in result) {
    return result;
  }
  revalidatePath("/account");
  return { success: true };
});

export const updatePersonalDetailsAction = AuthenticatedAction(
  async (
    session,
    {
      firstName,
      lastName,
    }: {
      firstName: string;
      lastName: string;
    }
  ) => {
    // Validate form entries
    const formData: { [k: string]: FormDataEntryValue } = {
      firstname: firstName,
      lastname: lastName,
    };
    const validationResult = await validatePersonalDetails(formData);
    if (!validationResult.success) {
      return { error: "Failed to update account. Invalid fields." };
    }

    const request = create(UpdateHumanUserRequestSchema, {
      userId: session.factors.user.id,
      profile: {
        givenName: firstName,
        familyName: lastName,
        displayName: `${firstName} ${lastName}`,
      },
    });
    const result = await updateHuman({ request }).catch((e) => {
      logMessage.error("Failed to update account", e);
      return { error: "Failed to update account" };
    });

    if ("error" in result) {
      return result;
    }

    logMessage.info(`Updating account with firstName: ${firstName}, lastName: ${lastName}`);
    revalidatePath("/account");
    return { success: true };
  }
);

// Check if user has at least 2 MFA methods configured.
// Ensures at least one MFA method remains after removal to prevent lockout.
async function _hasMultipleMFAMethods(session: SessionWithAuthData): Promise<boolean> {
  const hasTOTP = session.authMethods.includes(4);
  const hasU2F = session.authMethods.includes(5);
  // Both are availabe so one can be removed
  if (hasTOTP && hasU2F) {
    return true;
  }
  // Only has authenticator so must add before removal
  if (hasTOTP && !hasU2F) {
    return false;
  }

  if (hasU2F) {
    // get list to see if there are multiple so that one can be removed
    const u2fList = await getU2FList({
      userId: session.factors.user.id,
    });

    if (u2fList.length > 1) {
      // User has multiple keys, one can be removed
      return true;
    }
  }

  return false;
}

export const logoutAndRegister = AuthenticatedAction(async (_) => {
  const result = await logoutCurrentSession({ postLogoutRedirectUri: "/register" });
  if ("error" in result) {
    throw new Error(result.error);
  }
  redirect(result.redirect, "push");
});
