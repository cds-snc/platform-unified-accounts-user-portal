import { expect, test } from "@playwright/test";

import { addVirtualAuthenticator, type VirtualAuthenticatorCredential } from "./utils/browser";
import { generateTOTP, getRandomEmail, getRandomPassword, getRequiredEnv } from "./utils/utils";
import {
  deleteUserById,
  getEmailVerificationCode,
  getUserIdByEmail,
  getZitadelAccessToken,
} from "./utils/zitadel";

type RegisteredUser = {
  email: string;
  password: string;
  userId: string;
  totpSecret?: string;
  u2fCredential?: VirtualAuthenticatorCredential;
};

test.describe("register user flow", () => {
  let idpUrl: string;
  let portalUrl: string;
  let userId: string;
  let serviceAccountKey: string;
  let accessToken: string;
  const registeredUsers: RegisteredUser[] = [];

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
  });

  test.afterAll(async () => {
    await Promise.all(
      registeredUsers.map((user) => deleteUserById(user.userId, accessToken, idpUrl))
    );
  });

  test("creates a new users with TOTP MFA", async ({ page }) => {
    const email = getRandomEmail(getRequiredEnv("REGISTER_EMAIL"));
    const password = getRandomPassword();

    await page.goto(portalUrl);

    // Login
    await expect(page.getByTestId("register-link")).toBeVisible();
    await page.getByTestId("register-link").click();

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
    userId = await getUserIdByEmail(email, accessToken, idpUrl);
    const emailVerificationCode = await getEmailVerificationCode(userId, accessToken, idpUrl);
    await page.locator("#verify-form #code").fill(emailVerificationCode);
    await page.locator("#verify-form button[type='submit']").click();

    // MFA select
    await expect(page.locator("#mfa-select")).toBeVisible();
    await page.locator("#mfa-select div[data-type='authenticator']").click();
    await page.locator("button#mfa-continue").click();

    // TOTP setup
    const totpLink = page.getByTestId("totp-link");
    await expect(totpLink).toBeVisible();
    const totpUrl = await totpLink.getAttribute("href");
    const totpSecret = new URL(totpUrl!).searchParams.get("secret")!;
    await page.locator("#totp-form #code").fill(generateTOTP(totpSecret!));
    await page.locator("#totp-form button[type='submit']").click();

    // TOTP setup success
    await expect(page.getByTestId("all-set")).toBeVisible();
    await expect(page.getByTestId("continue-button")).toBeVisible();
    await page.getByTestId("continue-button").click();

    // Account page
    await expect(page.locator("#personal-details-title")).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);

    registeredUsers.push({ email, password, userId, totpSecret: totpSecret });
  });

  test("creates a new users with U2F MFA", async ({ page }) => {
    const email = getRandomEmail(getRequiredEnv("REGISTER_EMAIL"));
    const password = getRandomPassword();

    await page.goto(portalUrl);
    const { cdpSession, authenticatorId } = await addVirtualAuthenticator(page);

    // Login
    await expect(page.getByTestId("register-link")).toBeVisible();
    await page.getByTestId("register-link").click();

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
    const u2fUserId = await getUserIdByEmail(email, accessToken, idpUrl);
    const emailVerificationCode = await getEmailVerificationCode(u2fUserId, accessToken, idpUrl);
    await page.locator("#verify-form #code").fill(emailVerificationCode);
    await page.locator("#verify-form button[type='submit']").click();

    // MFA select
    await expect(page.locator("#mfa-select")).toBeVisible();
    await page.locator("#mfa-select div[data-type='securityKey']").click();
    await page.locator("button#mfa-continue").click();

    // U2F setup and confirmation
    await expect(page.locator("#keyName")).toBeVisible();
    await page.locator("#keyName").fill("Integration test security key");
    await page.getByTestId("submit-button").click();

    // Registration complete
    await expect(page.getByTestId("all-set")).toBeVisible();
    await expect(page.getByTestId("continue-button")).toBeVisible();
    await page.getByTestId("continue-button").click();

    // Account page
    await expect(page.locator("#personal-details-title")).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);

    const { credentials } = await cdpSession.send("WebAuthn.getCredentials", { authenticatorId });
    expect(credentials).toHaveLength(1);

    const u2fCredential = credentials[0] as VirtualAuthenticatorCredential;
    expect(u2fCredential.credentialId).toBeTruthy();

    registeredUsers.push({ email, password, userId, u2fCredential: u2fCredential });
  });
});
