"use server";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthenticatedAction } from "@lib/actions/authenticated";
import { changePassword, verifyPassword } from "@lib/server/password";
import { validatePassword } from "@lib/validation/validationSchemas";

export const changePasswordFormAction = AuthenticatedAction(async function changePasswordFormAction(
  session,
  password: string,
  requestId?: string
) {
  const validationResult = await validatePassword({ password } as {
    [k: string]: FormDataEntryValue;
  });
  if (!validationResult.success) {
    throw new Error("Invalid password");
  }

  await changePassword({
    password,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000)); // wait for a second, to prevent eventual consistency issues

  await verifyPassword({
    loginName: session.factors.user.loginName,
    checks: create(ChecksSchema, {
      password: { password },
    }),
    requestId,
  });
});
