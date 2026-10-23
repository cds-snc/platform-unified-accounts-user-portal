import { expect, test } from "@playwright/test";

import { type RegisteredUser, registerUser } from "./utils/register";
import { MfaType, RegistrationType } from "./utils/register";
import { generateTOTP, getRequiredEnv } from "./utils/utils";
import { deleteUserById, getPasswordResetCode, getZitadelAccessToken } from "./utils/zitadel";

test.describe("account edit flow", () => {
  test.describe.configure({ mode: "serial" });

  let idpUrl: string;
  let portalUrl: string;
  let serviceAccountKey: string;
  let registerEmail: string;
  let zitadelOrgId: string;
  let accessToken: string;
  let registeredUser: RegisteredUser | null = null;

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
    registerEmail = getRequiredEnv("REGISTER_EMAIL");
    zitadelOrgId = getRequiredEnv("ZITADEL_ORGANIZATION_ID");
  });

  test.afterAll(async () => {
    if (registeredUser) {
      await deleteUserById(registeredUser!.userId, accessToken, idpUrl);
    }
  });

  test("updates a user's name and password", async ({ page }) => {
    const newPassword = "NewPassword123!";
    registeredUser = await registerUser(page, {
      portalUrl,
      idpUrl,
      accessToken,
      registerEmail,
      zitadelOrgId,
      mfaType: MfaType.TOTP,
      registrationFlow: RegistrationType.INVITE,
    });

    await page.getByTestId("account-name-change").click();
    await page.locator("#personal-details-form #firstname").fill("Updated");
    await page.locator("#personal-details-form #lastname").fill("Account");
    await page.locator("#personal-details-form button[type='submit']").click();

    await page.getByTestId("account-password-change").click();
    await expect(page.locator("#password-form #password")).toBeVisible();
    await page.locator("#password-form #password").fill(newPassword);
    await page.locator("#password-form #confirmPassword").fill(newPassword);
    await page.getByTestId("password-validation-continue").click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId("account-name")).toHaveText("Updated Account");
    await expect(page.getByTestId("account-email")).toHaveText(registeredUser!.email);
  });

  test("updates a user's password using forgot password", async ({ page }) => {
    const newPassword = "ForgotPassword123!";
    if (!registeredUser) {
      throw new Error("Registered user is required for this test");
    }

    await page.goto(portalUrl);
    await page.getByTestId("forgot-password").click();
    await page.getByTestId("forgot-password-username").fill(registeredUser.email);
    await page.getByTestId("forgot-password-continue").click();

    await expect(page).toHaveURL(/\/password\/reset\/verify/);
    await page.getByTestId("strong-factor-totp").click();
    await page.getByTestId("strong-factor-continue").click();

    await expect(page.locator("#totp #code")).toBeVisible();
    await page.locator("#totp #code").fill(generateTOTP(registeredUser.totpSecret!));
    await page.getByTestId("totp-submit").click();

    await expect(page).toHaveURL(/\/password\/reset\/set/);
    const passwordResetCode = await getPasswordResetCode(
      registeredUser.userId,
      accessToken,
      idpUrl
    );
    await page.locator("#password-form #code").fill(passwordResetCode);
    await page.locator("#password-form #password").fill(newPassword);
    await page.locator("#password-form #confirmPassword").fill(newPassword);
    await page.getByTestId("password-validation-continue").click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId("account-email")).toHaveText(registeredUser.email);
  });
});
