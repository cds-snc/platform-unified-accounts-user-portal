import { expect, type Page, test } from "@playwright/test";

import { generateTOTP, getRandomEmail, getRandomPassword, getRequiredEnv } from "./utils/utils";
import {
  deleteUserById,
  getEmailVerificationCode,
  getUserIdByEmail,
  getZitadelAccessToken,
} from "./utils/zitadel";

type VirtualAuthenticatorCredential = {
  credentialId: string;
  isResidentCredential: boolean;
  rpId: string;
  privateKey: string;
  signCount: number;
  userHandle?: string;
};

type RegisteredU2FUser = {
  email: string;
  password: string;
  userId: string;
};

async function addVirtualAuthenticator(page: Page, credential?: VirtualAuthenticatorCredential) {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("WebAuthn.enable");

  const { authenticatorId } = await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "usb",
      hasResidentKey: false,
      hasUserVerification: false,
      isUserVerified: false,
      automaticPresenceSimulation: true,
    },
  });

  if (credential) {
    await cdpSession.send("WebAuthn.addCredential", { authenticatorId, credential });
  }

  return { cdpSession, authenticatorId };
}

test.describe("register user flow", () => {
  let idpUrl: string;
  let email: string;
  let password: string;
  let portalUrl: string;
  let userId: string;
  let serviceAccountKey: string;
  let accessToken: string;
  let registeredU2FUser: RegisteredU2FUser | undefined;
  let registeredU2FCredential: VirtualAuthenticatorCredential | undefined;

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    email = getRandomEmail(getRequiredEnv("REGISTER_EMAIL"));
    password = getRandomPassword();
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
  });

  test.afterAll(async () => {
    if (userId) {
      await deleteUserById(userId, accessToken, idpUrl);
    }

    if (registeredU2FUser) {
      await deleteUserById(registeredU2FUser.userId, accessToken, idpUrl);
    }
  });

  test("creates a new users with TOTP MFA", async ({ page }) => {
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
    const totpSecret = new URL(totpUrl!).searchParams.get("secret");
    await page.locator("#totp-form #code").fill(generateTOTP(totpSecret!));
    await page.locator("#totp-form button[type='submit']").click();

    // TOTP setup success
    await expect(page.getByTestId("all-set")).toBeVisible();
    await expect(page.getByTestId("continue-button")).toBeVisible();
    await page.getByTestId("continue-button").click();

    // Account page
    await expect(page.locator("#personal-details-title")).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("creates a new users with U2F MFA", async ({ page }) => {
    const u2fEmail = getRandomEmail(getRequiredEnv("REGISTER_EMAIL"));
    const u2fPassword = getRandomPassword();

    await page.goto(portalUrl);
    const { cdpSession, authenticatorId } = await addVirtualAuthenticator(page);

    // Login
    await expect(page.getByTestId("register-link")).toBeVisible();
    await page.getByTestId("register-link").click();

    // User details
    await expect(page.locator("#register-form #firstname")).toBeVisible();
    await page.locator("#register-form #firstname").fill("Integration");
    await page.locator("#register-form #lastname").fill("Test");
    await page.locator("#register-form #email").fill(u2fEmail);
    await page.locator("#register-form button[type='submit']").click();

    // Password
    await expect(page.locator("#password-form #password")).toBeVisible();
    await page.locator("#password-form #password").fill(u2fPassword);
    await page.locator("#password-form #confirmPassword").fill(u2fPassword);
    await page.locator("#password-form button[type='submit']").click();

    // Email verify
    await expect(page.locator("#verify-form #code")).toBeVisible();
    const u2fUserId = await getUserIdByEmail(u2fEmail, accessToken, idpUrl);
    registeredU2FUser = { email: u2fEmail, password: u2fPassword, userId: u2fUserId };
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
    registeredU2FCredential = credentials[0] as VirtualAuthenticatorCredential;
    expect(registeredU2FCredential.credentialId).toBeTruthy();
  });
});
