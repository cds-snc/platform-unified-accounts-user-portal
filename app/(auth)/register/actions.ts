"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookieWithRetry } from "@lib/server/cookie";
import { validateAccountWithPassword } from "@lib/validationSchemas";
import { checkEmailVerification } from "@lib/verify-helper";
import { addHumanUser, getLoginSettings } from "@lib/zitadel";
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

  const session = await createSessionAndUpdateCookieWithRetry({
    checks,
    requestId: command.requestId,
    lifetime: loginSettings?.passwordCheckLifetime,
  });

  if (!session || !session.factors?.user) {
    logMessage.error("Failed to create session after registration");
    return { error: t("errors.couldNotCreateSession") };
  }

  // An undefined humanUser is passed as the newly created user will not have their
  // email verified yet so the behaviour we want is to trigger the email verification flow.
  return checkEmailVerification(session, undefined, command.requestId);
}
