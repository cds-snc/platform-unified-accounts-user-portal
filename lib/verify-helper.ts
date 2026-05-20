/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { cookies } from "next/headers";
import { timestampDate } from "@zitadel/client";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { PasswordExpirySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";
import { HumanUser } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import crypto from "crypto";
import moment from "moment";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { getFingerprintIdCookie } from "./fingerprint";
import { logMessage } from "./logger";
import { buildUrlWithRequestId } from "./utils";
export function checkPasswordChangeRequired(
  expirySettings: PasswordExpirySettings | undefined,
  session: Session,
  humanUser: HumanUser | undefined,
  requestId?: string
) {
  let isOutdated = false;
  if (expirySettings?.maxAgeDays && humanUser?.passwordChanged) {
    const maxAgeDays = Number(expirySettings.maxAgeDays); // Convert bigint to number
    // If maxAgeDays is 0 then the policy is not defined, return early
    if (maxAgeDays === 0) {
      return;
    }
    const passwordChangedDate = moment(timestampDate(humanUser.passwordChanged));
    const outdatedPassword = passwordChangedDate.add(maxAgeDays, "days");
    isOutdated = moment().isAfter(outdatedPassword);
  }

  if (humanUser?.passwordChangeRequired || isOutdated) {
    const params = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
    });

    if (requestId) {
      params.append("requestId", requestId);
    }

    return { redirect: "/password/change?" + params };
  }
}

export function checkEmailVerification(
  session: Session,
  humanUser?: HumanUser,
  requestId?: string
) {
  if (!humanUser?.email?.isVerified) {
    const params = new URLSearchParams({
      userId: session.factors?.user?.id as string,
      send: "true", // set this to true as we dont expect old email codes to be valid anymore
    });
    const verifyUrl = buildUrlWithRequestId("/verify", requestId);
    const [basePath, existingQuery = ""] = verifyUrl.split("?");
    const mergedParams = new URLSearchParams(existingQuery);
    params.forEach((value, key) => mergedParams.set(key, value));

    return { redirect: `${basePath}?${mergedParams.toString()}` };
  }
}

export async function checkMFAFactors(
  authMethods: AuthenticationMethodType[],
  requestId?: string
): Promise<{ error: string } | { redirect: string }> {
  // Strong MFA methods (TOTP/U2F) - at least one must exist
  const strongFactors = authMethods?.filter(
    (m: AuthenticationMethodType) =>
      m === AuthenticationMethodType.TOTP || m === AuthenticationMethodType.U2F
  );

  // If no strong factor exists, redirect to setup
  if (!strongFactors.length) {
    logMessage.info("Redirecting user to MFA setup - strong MFA required");
    return { redirect: buildUrlWithRequestId(`/mfa/set`, requestId) };
  }

  // If user has only one MFA method total, redirect directly to that
  if (strongFactors.length === 1) {
    const factor = strongFactors[0];
    if (factor === AuthenticationMethodType.TOTP) {
      logMessage.info("Redirecting user to TOTP verification");
      return { redirect: buildUrlWithRequestId(`/otp/time-based`, requestId) };
    } else if (factor === AuthenticationMethodType.U2F) {
      logMessage.info("Redirecting user to U2F verification");
      return { redirect: buildUrlWithRequestId(`/u2f`, requestId) };
    }
  }

  // Multiple MFA methods available - show selection page
  if (strongFactors.length > 1) {
    logMessage.info("Redirecting user to MFA selection page");
    return { redirect: buildUrlWithRequestId(`/mfa`, requestId) };
  }

  return { error: "No MFA factors available" };
}

export async function checkUserVerification(userId: string): Promise<boolean> {
  // check if a verification was done earlier
  const cookiesList = await cookies();

  // only read cookie to prevent issues on page.tsx
  const fingerPrintCookie = await getFingerprintIdCookie();

  if (!fingerPrintCookie || !fingerPrintCookie.value) {
    return false;
  }

  const verificationCheck = crypto
    .createHash("sha256")
    .update(`${userId}:${fingerPrintCookie.value}`)
    .digest("hex");

  const cookieValue = cookiesList.get("verificationCheck")?.value;

  if (!cookieValue) {
    return false;
  }

  if (cookieValue !== verificationCheck) {
    return false;
  }

  return true;
}
