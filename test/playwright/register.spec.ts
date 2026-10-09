import { expect, test } from "@playwright/test";

import { type RegisteredUser, registerUser } from "./utils/register";
import { MfaType, RegistrationType } from "./utils/register";
import { getRequiredEnv } from "./utils/utils";
import { deleteUserById, getZitadelAccessToken } from "./utils/zitadel";

test.describe("register user flow", () => {
  let idpUrl: string;
  let portalUrl: string;
  let serviceAccountKey: string;
  let registerEmail: string;
  let accessToken: string;
  let zitadelOrgId: string;
  const registeredUsers: RegisteredUser[] = [];

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
    registerEmail = getRequiredEnv("REGISTER_EMAIL");
    zitadelOrgId = getRequiredEnv("ZITADEL_ORGANIZATION");
  });

  test.afterAll(async () => {
    await Promise.all(
      registeredUsers.map((user) => deleteUserById(user.userId, accessToken, idpUrl))
    );
  });

  test("registration page is closed", async ({ page }) => {
    await page.goto(portalUrl);
    await page.getByTestId("register").click();
    await expect(page.getByTestId("registration-closed")).toBeVisible();
  });

  test("creates a new user with TOTP MFA", async ({ page }) => {
    registeredUsers.push(
      await registerUser(page, {
        portalUrl,
        idpUrl,
        accessToken,
        registerEmail,
        zitadelOrgId,
        mfaType: MfaType.TOTP,
        registrationFlow: RegistrationType.INVITE,
      })
    );
  });

  test("creates a new user with U2F MFA", async ({ page }) => {
    registeredUsers.push(
      await registerUser(page, {
        portalUrl,
        idpUrl,
        accessToken,
        registerEmail,
        zitadelOrgId,
        mfaType: MfaType.U2F,
        registrationFlow: RegistrationType.INVITE,
      })
    );
  });
});
