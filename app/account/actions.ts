"use server";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { revalidatePath } from "next/cache";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import {
  protectedGetTOTPStatus,
  protectedGetU2FList,
  protectedRemoveTOTP,
  protectedRemoveU2F,
  protectedUpdatePersonalDetails,
} from "@lib/server/zitadel-protected";
import { validatePersonalDetails } from "@lib/validationSchemas";

export async function removeU2FAction(userId: string, u2fId: string) {
  try {
    const hasMultipleMFA = await _hasMultipleMFAMethods(userId);
    if (!hasMultipleMFA) {
      return {
        error:
          "Cannot remove security key. At least one strong authentication method must be configured to remove one.",
      };
    }

    const result = await protectedRemoveU2F(userId, u2fId);
    if ("error" in result) {
      return result;
    }
    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    logMessage.error("Failed to remove U2F", error);
    return { error: error instanceof Error ? error.message : "Failed to remove security key" };
  }
}

export async function removeTOTPAction(userId: string) {
  try {
    const hasMultipleMFA = await _hasMultipleMFAMethods(userId);
    if (!hasMultipleMFA) {
      return {
        error:
          "Cannot remove authenticator. At least one strong authentication methods must be configured to remove one.",
      };
    }

    const result = await protectedRemoveTOTP(userId);
    if ("error" in result) {
      return result;
    }
    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    logMessage.error("Failed to remove TOTP", error);
    return { error: "Failed to remove Authentication method" };
  }
}

export async function updatePersonalDetailsAction({
  userId,
  firstName,
  lastName,
}: {
  userId: string;
  firstName: string;
  lastName: string;
}) {
  try {
    // Validate form entries just encase
    const formData: { [k: string]: FormDataEntryValue } = {
      firstname: firstName,
      lastname: lastName,
    };
    const validationResult = await validatePersonalDetails(formData);
    if (!validationResult.success) {
      return { error: "Failed to update account. Invalid fields." };
    }

    await protectedUpdatePersonalDetails(userId, { firstName, lastName });
    logMessage.info(`Updating account with firstName: ${firstName}, lastName: ${lastName}`);
    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    logMessage.error("Failed to update account", error);
    return { error: "Failed to update account" };
  }
}

// Check if user has at least 2 MFA methods configured.
// Ensures at least one MFA method remains after removal to prevent lockout.
async function _hasMultipleMFAMethods(userId: string): Promise<boolean> {
  const [totpResult, u2fResult] = await Promise.all([
    protectedGetTOTPStatus(userId),
    protectedGetU2FList(userId),
  ]);

  // Handle error cases - return false if we can't determine MFA status
  if (typeof totpResult === "object" && "error" in totpResult) {
    return false;
  }
  if (typeof u2fResult === "object" && "error" in u2fResult) {
    return false;
  }

  // Count total MFA methods: TOTP (0 or 1) + U2F devices count
  const totpCount = totpResult ? 1 : 0;
  const u2fCount = u2fResult.length;
  const totalMethods = totpCount + u2fCount;

  return totalMethods >= 2;
}
