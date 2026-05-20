import { expect, test } from "@playwright/test";

import { generateTOTP, getRandomEmail, getRandomPassword, getRequiredEnv } from "./utils/utils";
import { deleteUserById, getEmailVerificationCode, getUserIdByEmail } from "./utils/zitadel";

test.describe("register user flow", () => {
  let idpUrl = "";
  let email = "";
  let password = "";
  let portalUrl = "";
  let userId = "";
  let zitadelBearerToken = "";

  test.beforeAll(() => {
    idpUrl = getRequiredEnv("IDP_URL");
    email = getRandomEmail(getRequiredEnv("USERNAME"));
    password = getRandomPassword();
    portalUrl = getRequiredEnv("PORTAL_URL");
    zitadelBearerToken = getRequiredEnv("ZITADEL_BEARER_TOKEN");
  });

  test.afterAll(async () => {
    if (userId) {
      await deleteUserById(userId, zitadelBearerToken, idpUrl);
    }
  });

  test("creates a new users with TOTP MFA", async ({ page }) => {
    await page.goto(portalUrl);

    // Login
    await expect(page.locator("a[href$='/register']")).toBeVisible();
    await page.locator("a[href$='/register']").click();

    // User details
    await expect(page.locator("#register-form #firstname")).toBeVisible();
    await page.locator("#register-form #firstname").fill("Integration");
    await page.locator("#register-form #lastname").fill("Test");
    await page.locator("#register-form #email").fill(email);
    await page.locator("#register-form button[type='submit']").click();

    // Password
    await expect(page.locator("#password-form #password")).toBeVisible();
    await page.locator("#password-form #password").fill(password);
    await page.locator("#password-form #confirmPassword").fill(password);
    await page.locator("#password-form button[type='submit']").click();

    // Email verify
    await expect(page.locator("#verify-form #code")).toBeVisible();
    userId = await getUserIdByEmail(email, zitadelBearerToken, idpUrl);
    const emailVerificationCode = await getEmailVerificationCode(
      userId,
      zitadelBearerToken,
      idpUrl
    );
    await page.locator("#verify-form #code").fill(emailVerificationCode);
    await page.locator("#verify-form button[type='submit']").click();

    // Email verify success
    await expect(page.locator("img[alt='Success']")).toBeVisible();
    await page.locator("a[href$='/mfa/set']").click();

    // MFA select
    await expect(page.locator("#mfa-select")).toBeVisible();
    await page.locator("#mfa-select div[data-type='authenticator']").click();
    await page.locator("button#mfa-continue").click();

    // TOTP setup
    const totpLink = page.locator("a[href^='otpauth://']");
    await expect(totpLink).toBeVisible();
    const totpUrl = await totpLink.getAttribute("href");
    const totpSecret = new URL(totpUrl!).searchParams.get("secret");
    await page.locator("#totp-form #code").fill(generateTOTP(totpSecret!));
    await page.locator("#totp-form button[type='submit']").click();

    // TOTP setup success
    await expect(page.locator("img[alt='All set']")).toBeVisible();
    await page.locator("a[href$='/account']").click();

    // Account page
    await expect(page.locator("#personal-details-title")).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });
});
