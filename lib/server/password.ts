"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { SetPasswordRequestSchema } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { hasStrongMFA } from "@lib/server/route-protection";
import {
  getLoginSettings,
  getUserByID,
  listAuthenticationMethodTypes,
  setPassword,
  setUserPassword,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { logMessage } from "../../lib/logger";
import { getActiveSessionCookie } from "../cookies";
import { loadActiveSession } from "../session";
import { checkUserVerification } from "../verify-helper";

import { completeFlowAndRedirect } from "./auth-flow";
import { sendPasswordChangedEmail } from "./verify";

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

type UpdateSessionCommand = {
  loginName: string;
  checks: Checks;
  requestId?: string;
};

export async function verifyPassword(command: UpdateSessionCommand) {
  const sessionCookie = await getActiveSessionCookie();
  const { t } = await serverTranslation("password");
  const loginSettings = await getLoginSettings();

  const session = await setSessionAndUpdateCookie({
    activeCookie: sessionCookie,
    checks: command.checks,
    requestId: command.requestId,
  }).catch((e) => {
    logMessage.error(
      `Could not verify password during reset/change for user ${sessionCookie.loginName}`,
      e
    );
    throw new Error(t("errors.failedToAuthenticate"));
  });

  await completeFlowAndRedirect(
    {
      sessionId: session.id,
      requestId: command.requestId,
    },
    loginSettings?.defaultRedirectUri
  );
}

export async function passwordResetWithCode(command: {
  code?: string;
  userId: string;
  password: string;
}) {
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
  password: string;
};

export async function changePassword({ password }: CheckSessionAndSetPasswordCommand) {
  const session = await loadActiveSession();
  const { t } = await serverTranslation("password");
  const payload = create(SetPasswordRequestSchema, {
    userId: session.factors.user.id,
    newPassword: {
      password,
    },
  });

  return setPassword({ payload })
    .then(async (result) => {
      // Send password changed email notification
      if (didPasswordChangeSucceed(result)) {
        sendPasswordChangedEmail({ userId: session.factors!.user!.id }).catch((error) => {
          logMessage.debug({
            error: error instanceof Error ? error.message : error,
            message: "Failed to send password changed email",
          });
          // Don't fail the password change if email fails
        });
      }
    })
    .catch((error) => {
      logMessage.error("Could not set password for user", error);
      throw new Error(t("change.errors.couldNotChangePassword"));
    });
}
