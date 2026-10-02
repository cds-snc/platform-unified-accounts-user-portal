import { expect, test } from "@playwright/test";

import { type RegisteredUser, registerUser } from "./utils/register";
import { MfaType } from "./utils/register";
import { getRequiredEnv } from "./utils/utils";
import { deleteUserById, getZitadelAccessToken } from "./utils/zitadel";

test.describe("account edit flow", () => {
  let idpUrl: string;
  let portalUrl: string;
  let serviceAccountKey: string;
  let registerEmail: string;
  let accessToken: string;
  let registeredUsers: RegisteredUser | null = null;

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
    registerEmail = getRequiredEnv("REGISTER_EMAIL");
  });

  test.afterAll(async () => {
    await deleteUserById(registeredUsers!.userId, accessToken, idpUrl);
  });

  test("updates a user's name", async ({ page }) => {
    registeredUsers = await registerUser(page, {
      portalUrl,
      idpUrl,
      accessToken,
      registerEmail,
      mfaType: MfaType.TOTP,
    });

    await page.getByTestId("account-name-change").click();
    await page.locator("#personal-details-form #firstname").fill("Updated");
    await page.locator("#personal-details-form #lastname").fill("Account");
    await page.locator("#personal-details-form button[type='submit']").click();

    await expect(page.getByTestId("account-name")).toHaveText("Updated Account");
  });
});
