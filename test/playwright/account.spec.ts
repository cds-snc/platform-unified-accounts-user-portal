import { expect, test } from "@playwright/test";

import { type RegisteredUser, registerUser } from "./utils/register";
import { MfaType } from "./utils/register";
import { getRequiredEnv } from "./utils/utils";
import { deleteUserById, getZitadelAccessToken } from "./utils/zitadel";

test.describe("account edit flow", () => {
  test.describe.configure({ mode: "serial" });

  let idpUrl: string;
  let portalUrl: string;
  let serviceAccountKey: string;
  let registerEmail: string;
  let accessToken: string;
  let registeredUser: RegisteredUser | null = null;

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
    registerEmail = getRequiredEnv("REGISTER_EMAIL");
  });

  test.afterAll(async () => {
    await deleteUserById(registeredUser!.userId, accessToken, idpUrl);
  });

  test("updates a user's name and password", async ({ page }) => {
    const newPassword = "NewPassword123!";
    registeredUser = await registerUser(page, {
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

    await page.getByTestId("account-password-change").click();
    await expect(page.locator("#password-form #password")).toBeVisible();
    await page.locator("#password-form #password").fill(newPassword);
    await page.locator("#password-form #confirmPassword").fill(newPassword);
    await page.locator("#password-form button[type='submit']").click();
    registeredUser.password = newPassword;

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId("account-name")).toHaveText("Updated Account");
    await expect(page.getByTestId("account-email")).toHaveText(registeredUser!.email);
  });
});
