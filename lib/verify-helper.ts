/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { timestampDate } from "@zitadel/client";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { HumanUser } from "@zitadel/proto/zitadel/user/v2/user_pb";
import moment from "moment";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { buildUrlWithRequestId } from "./utils";
import { getPasswordExpirySettings } from "./zitadel";
export async function checkPasswordChangeRequired(
  session: Session,
  humanUser: HumanUser | undefined,
  requestId?: string
) {
  let isOutdated = false;
  const expirySettings = await getPasswordExpirySettings();

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
