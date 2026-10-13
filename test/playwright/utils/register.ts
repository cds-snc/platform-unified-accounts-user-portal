import { expect, type Page } from "@playwright/test";

import { addVirtualAuthenticator, type VirtualAuthenticatorCredential } from "./browser";
import { generateTOTP, getRandomEmail, getRandomPassword } from "./utils";
import { createUserInvitation, getEmailVerificationCode, getUserIdByEmail } from "./zitadel";

export const MfaType = {
  TOTP: "totp",
  U2F: "u2f",
} as const;

export const RegistrationType = {
  OPEN: "open",
  INVITE: "invite",
} as const;

export type RegisteredUser = {
  email: string;
  password: string;
  userId: string;
  totpSecret?: string;
  u2fCredential?: VirtualAuthenticatorCredential;
};

export async function registerUser(
  page: Page,
  {
    portalUrl,
    idpUrl,
    accessToken,
    registerEmail,
    zitadelOrgId,
    mfaType,
    registrationFlow,
  }: {
    portalUrl: string;
    idpUrl: string;
    accessToken: string;
    registerEmail: string;
    zitadelOrgId: string;
    mfaType: (typeof MfaType)[keyof typeof MfaType];
    registrationFlow: (typeof RegistrationType)[keyof typeof RegistrationType];
  }
): Promise<RegisteredUser> {
  const email = getRandomEmail(registerEmail);
  const password = getRandomPassword();
  const virtualAuthenticator =
    mfaType === MfaType.U2F ? await addVirtualAuthenticator(page) : undefined;

  // Start registration flow
  if (registrationFlow === RegistrationType.INVITE) {
    const inviteCode = await createUserInvitation(email, accessToken, idpUrl, zitadelOrgId);
    const registerParam = Buffer.from(
      JSON.stringify({ inviteCode, inviteEmail: email }),
      "utf8"
    ).toString("base64");
    const registrationUrl = new URL(`${portalUrl}/register`);
    registrationUrl.searchParams.set("invite", registerParam);
    await page.goto(registrationUrl.toString());
  } else if (registrationFlow === RegistrationType.OPEN) {
    await page.goto(portalUrl);
    await expect(page.getByTestId("register-link")).toBeVisible();
    await page.getByTestId("register-link").click();
  } else {
    throw new Error(`Unsupported registration flow: ${registrationFlow}`);
  }

  // Enter user details
  await expect(page.locator("#register-form #firstname")).toBeVisible();
  await page.locator("#register-form #firstname").fill("Integration");
  await page.locator("#register-form #lastname").fill("Test");
  if (registrationFlow === RegistrationType.INVITE) {
    await expect(page.locator("#register-form #email")).toHaveValue(email);
  } else {
    await page.locator("#register-form #email").fill(email);
  }
  await page.locator("#register-form button[type='submit']").click();

  // Set password
  await expect(page.locator("#password-form #password")).toBeVisible();
  await page.locator("#password-form #password").fill(password);
  await page.locator("#password-form #confirmPassword").fill(password);
  await page.locator("#password-form button[type='submit']").click();

  // Verify email
  await expect(page.locator("#verify-form #code")).toBeVisible();
  const userId = await getUserIdByEmail(email, accessToken, idpUrl);
  const emailVerificationCode = await getEmailVerificationCode(userId, accessToken, idpUrl);
  await page.locator("#verify-form #code").fill(emailVerificationCode);
  await page.locator("#verify-form button[type='submit']").click();

  // Select MFA method
  await expect(page.locator("#mfa-select")).toBeVisible();
  const mfaOption = mfaType === "totp" ? "authenticator" : "securityKey";
  await page.locator(`#mfa-select div[data-type='${mfaOption}']`).click();
  await page.locator("button#mfa-continue").click();

  const registeredUser: RegisteredUser = { email, password, userId };

  // Setup MFA
  if (mfaType === MfaType.TOTP) {
    const totpLink = page.getByTestId("totp-link");
    await expect(totpLink).toBeVisible();
    const totpUrl = await totpLink.getAttribute("href");
    registeredUser.totpSecret = new URL(totpUrl!).searchParams.get("secret")!;
    await page.locator("#totp-form #code").fill(generateTOTP(registeredUser.totpSecret));
    await page.locator("#totp-form button[type='submit']").click();
  } else if (mfaType === MfaType.U2F) {
    await expect(page.locator("#keyName")).toBeVisible();
    await page.locator("#keyName").fill("Integration test security key");
    await page.getByTestId("submit-button").click();
  } else {
    throw new Error(`Unsupported MFA type: ${mfaType}`);
  }

  // Complete registration
  await expect(page.getByTestId("all-set")).toBeVisible();
  await expect(page.getByTestId("continue-button")).toBeVisible();
  await page.getByTestId("continue-button").click();

  await expect(page.locator("#personal-details-title")).toBeVisible();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);

  // Store U2F credential
  if (mfaType === MfaType.U2F && virtualAuthenticator) {
    if (!virtualAuthenticator) {
      throw new Error("Expected a virtual authenticator for U2F registration");
    }

    const { credentials } = await virtualAuthenticator.cdpSession.send("WebAuthn.getCredentials", {
      authenticatorId: virtualAuthenticator.authenticatorId,
    });
    expect(credentials).toHaveLength(1);

    const u2fCredential = credentials[0] as VirtualAuthenticatorCredential;
    expect(u2fCredential.credentialId).toBeTruthy();
    registeredUser.u2fCredential = u2fCredential;
  }

  return registeredUser;
}
