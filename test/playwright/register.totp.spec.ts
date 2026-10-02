import { test } from "@playwright/test";

import { type RegisteredUser, registerUser } from "./utils/register";
import { MfaType } from "./utils/register";
import { getRequiredEnv } from "./utils/utils";
import { deleteUserById, getZitadelAccessToken } from "./utils/zitadel";

test.describe("register user flow", () => {
  let idpUrl: string;
  let portalUrl: string;
  let serviceAccountKey: string;
  let registerEmail: string;
  let accessToken: string;
  const registeredUsers: RegisteredUser[] = [];

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
    registerEmail = getRequiredEnv("REGISTER_EMAIL");
  });

  test.afterAll(async () => {
    await Promise.all(
      registeredUsers.map((user) => deleteUserById(user.userId, accessToken, idpUrl))
    );
  });

  test("creates a new users with TOTP MFA", async ({ page }) => {
    registeredUsers.push(
      await registerUser(page, {
        portalUrl,
        idpUrl,
        accessToken,
        registerEmail,
        mfaType: MfaType.TOTP,
      })
    );
  });

  test("creates a new users with U2F MFA", async ({ page }) => {
    registeredUsers.push(
      await registerUser(page, {
        portalUrl,
        idpUrl,
        accessToken,
        registerEmail,
        mfaType: MfaType.U2F,
      })
    );
  });
});
