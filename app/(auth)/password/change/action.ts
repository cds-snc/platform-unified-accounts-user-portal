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
import { checkSessionAndSetPassword, sendPassword } from "@lib/server/password";
import { serverTranslation } from "@i18n/server";

export const changePassword = AuthenticatedAction(
  async (session, password: string, requestId?: string) => {
    if (typeof password !== "string") {
      throw new Error("Invalid password string");
    }
    const { t } = await serverTranslation("password");

    await checkSessionAndSetPassword({
      password,
    }).catch(() => {
      throw new Error(t("change.errors.couldNotChangePassword"));
    });

    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait for a second, to prevent eventual consistency issues

    const result = await sendPassword({
      loginName: session.factors.user.loginName,
      checks: create(ChecksSchema, {
        password: { password },
      }),
      requestId,
    });

    if ("error" in result) {
      throw new Error(result.error);
    }
  }
);
