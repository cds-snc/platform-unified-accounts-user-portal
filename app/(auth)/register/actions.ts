"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { redirect } from "next/navigation";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import {
  SetPasswordRequestSchema,
  UpdateHumanUserRequestSchema,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { validateAccountWithPassword, validateCode } from "@lib/validation/validationSchemas";
import { checkEmailVerification } from "@lib/verify-helper";
import { addHumanUser, listUsers, setPassword, updateHuman, verifyInviteCode } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import { sendVerificationEmail } from "./verify/action";

type RegisterUserCommand = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  requestId?: string;
  inviteCode?: string;
};

// When registration is open export the `registerUser` function

export async function registerUser(command: RegisterUserCommand) {
  const { t } = await serverTranslation("register");

  if (process.env.OPEN_REGISTRATION !== "true") {
    if (command.inviteCode) {
      return completeInvite(command as CompleteInviteCommand);
    }
    return {
      error: t("errors.couldNotCreateUser"),
    };
  }

  let redirectUrl = null;

  try {
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

    const checks = create(ChecksSchema, {
      user: { search: { case: "userId", value: addResponse.userId } },
      password: { password: command.password },
    });

    const session = await createSessionAndUpdateCookie({
      checks,
      requestId: command.requestId,
      retry: true,
    });

    if (!session || !session.factors?.user) {
      logMessage.error("Failed to create session after registration");
      return { error: t("errors.couldNotCreateSession") };
    }

    // An undefined humanUser is passed as the newly created user will not have their
    // email verified yet so the behaviour we want is to trigger the email verification flow.

    redirectUrl = checkEmailVerification(session, undefined, command.requestId);

    // type check as there should always be a redirect in this use case
    if (!redirectUrl) {
      throw new Error(
        `[Registration Error] Could not complete registration flow for ${session.factors.user.loginName}`
      );
    }

    // Send the verification email to the newly registered user
    await sendVerificationEmail();
  } catch (e) {
    logMessage.error(
      `[Registration Error] Could not complete registration flow for ${command.email}`,
      (e as Error).message
    );

    return { error: t("errors.couldNotRegisterUser") };
  }
  redirect(redirectUrl.redirect, "push");
}

interface CompleteInviteCommand extends RegisterUserCommand {
  inviteCode: string;
}

async function completeInvite(command: CompleteInviteCommand) {
  const { t } = await serverTranslation("register");

  let redirectUrl = null;

  try {
    const [validationResult, codeValidation] = await Promise.all([
      validateAccountWithPassword({
        email: command.email,
        firstname: command.firstName,
        lastname: command.lastName,
        password: command.password,
      } as { [k: string]: FormDataEntryValue }),
      validateCode({
        code: command.inviteCode,
      } as {
        [k: string]: FormDataEntryValue;
      }),
    ]);

    if (!validationResult.success || !codeValidation.success) {
      logMessage.warn("Server side validation failed for registration");
      return {
        error: t("errors.couldNotCreateUser"),
      };
    }

    // Get userID
    const invitedUser = await listUsers({ email: command.email }).then(({ result }) => {
      if (result.length !== 1) {
        return null;
      }
      return result[0];
    });

    if (invitedUser === null) {
      logMessage.warn(
        `User ${command.email} attempted to register for an invite but does not exist`
      );
      return {
        error: t("errors.couldNotCreateUser"),
      };
    }

    // Check inviteCode
    const isValidInvite = await verifyInviteCode(command.inviteCode, invitedUser.userId);
    if (!isValidInvite) {
      logMessage.warn(`User ${command.email} attempted to register with an invalid invite code`);
      return {
        error: t("errors.couldNotCreateUser"),
      };
    }

    // update information on user
    await Promise.all([
      updateHuman({
        request: create(UpdateHumanUserRequestSchema, {
          userId: invitedUser.userId,
          profile: {
            givenName: command.firstName,
            familyName: command.lastName,
            displayName: `${command.firstName} ${command.lastName}`,
          },
        }),
      }),
      setPassword({
        payload: create(SetPasswordRequestSchema, {
          userId: invitedUser.userId,
          newPassword: {
            password: command.password,
            changeRequired: false,
          },
          verification: {
            case: undefined,
            value: undefined,
          },
        }),
      }),
    ]);

    // Continue with session or fail

    const checks = create(ChecksSchema, {
      user: { search: { case: "userId", value: invitedUser.userId } },
      password: { password: command.password },
    });

    const session = await createSessionAndUpdateCookie({
      checks,
      requestId: undefined,
      retry: true,
    });

    if (!session || !session.factors?.user) {
      logMessage.error("Failed to create session after registration");
      return { error: t("errors.couldNotCreateSession") };
    }

    // An undefined humanUser is passed as the newly created user will not have their
    // email verified yet so the behaviour we want is to trigger the email verification flow.

    redirectUrl = checkEmailVerification(session, undefined);

    // type check as there should always be a redirect in this use case
    if (!redirectUrl) {
      throw new Error(
        `[Registration Error] Could not complete registration flow for ${session.factors.user.loginName}`
      );
    }

    // Send the verification email to the newly registered user
    await sendVerificationEmail();
  } catch (e) {
    logMessage.error(
      `[Registration Error] Could not complete registration flow for ${command.email}`,
      (e as Error).message
    );

    return { error: t("errors.couldNotRegisterUser") };
  }
  redirect(redirectUrl.redirect, "push");
}
