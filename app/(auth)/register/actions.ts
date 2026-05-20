"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { completeFlowOrGetUrl } from "@lib/client";
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { validateAccountWithPassword } from "@lib/validationSchemas";
import { checkEmailVerification } from "@lib/verify-helper";
import { addHumanUser, getLoginSettings, getUserByID } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";
type RegisterUserCommand = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  requestId?: string;
};

export async function registerUser(command: RegisterUserCommand) {
  const { t } = await serverTranslation("register");

  const validationResult = await validateAccountWithPassword({
    email: command.email,
    firstname: command.firstName,
    lastname: command.lastName,
    password: command.password,
  } as { [k: string]: FormDataEntryValue });

  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for registration");
    return {
      error: t("errors.couldNotCreateUser"),
    };
  }

  const addResponse = await addHumanUser({
    email: command.email,
    firstName: command.firstName,
    lastName: command.lastName,
    password: command.password,
  });

  if (!addResponse) {
    logMessage.error("Failed to create user account during registration");
    return { error: t("errors.couldNotCreateUser") };
  }

  const loginSettings = await getLoginSettings();

  const checks = create(ChecksSchema, {
    user: { search: { case: "userId", value: addResponse.userId } },
    password: { password: command.password },
  });

  const session = await createSessionAndUpdateCookie({
    checks,
    requestId: command.requestId,
    lifetime: loginSettings?.passwordCheckLifetime,
  });

  if (!session || !session.factors?.user) {
    logMessage.error("Failed to create session after registration");
    return { error: t("errors.couldNotCreateSession") };
  }

  const userResponse = await getUserByID(session?.factors?.user?.id);

  if (!userResponse.user) {
    logMessage.error("Failed to fetch user after registration");
    return { error: t("errors.userNotFound") };
  }

  const humanUser =
    userResponse.user.type.case === "human" ? userResponse.user.type.value : undefined;

  const emailVerificationCheck = checkEmailVerification(session, humanUser, command.requestId);

  if (emailVerificationCheck?.redirect) {
    return emailVerificationCheck;
  }

  logMessage.info("User registered successfully");
  return completeFlowOrGetUrl(
    command.requestId && session.id
      ? {
          sessionId: session.id,
          requestId: command.requestId,
        }
      : {
          loginName: session.factors.user.loginName,
        },
    loginSettings?.defaultRedirectUri
  );
}
