import { expect, test } from "@playwright/test";
import * as oidc from "openid-client";

import { generateTOTP, getRequiredEnv } from "./utils/utils";

test.describe("login user flow", () => {
  let portalUrl = "";

  let testClientId = "";
  let testRedirectUri = "";

  let username = "";
  let password = "";
  let totpSecret = "";

  test.beforeAll(() => {
    portalUrl = getRequiredEnv("PORTAL_URL");

    username = getRequiredEnv("TEST_USER");
    password = getRequiredEnv("PASSWORD");
    totpSecret = getRequiredEnv("TOTP_SECRET");

    testClientId = getRequiredEnv("TEST_CLIENT_ID");
    testRedirectUri = getRequiredEnv("TEST_CALLBACK_URL");
  });

  test("logs in with TOTP and lands on the account page", async ({ page }) => {
    await page.goto(portalUrl);

    await expect(page.locator("#login #username")).toBeVisible();
    await page.locator("#login #username").fill(username);
    await page.locator("#login #password").fill(password);
    await page.locator("#login button[type=submit]").click();

    await expect(page.locator("#totp #code")).toBeVisible();
    await page.locator("#totp #code").fill(generateTOTP(totpSecret));
    await page.locator("#totp button[type=submit]").click();

    await expect(page.locator("#personal-details-title")).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("logs in with TOTP and completes the OIDC PKCE auth flow", async ({ page }) => {
    const issuerUrl = new URL(portalUrl);
    const redirectUri = new URL(testRedirectUri);

    const config = await oidc.discovery(
      issuerUrl,
      testClientId,
      { token_endpoint_auth_method: "none" },
      oidc.None()
    );
    const pkceCodeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(pkceCodeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();

    await page.route(
      (url) => url.origin === redirectUri.origin && url.pathname === redirectUri.pathname,
      (route) => route.fulfill({ status: 200, body: "OIDC callback received" })
    );

    const authorizationUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri.href,
      response_type: "code",
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });
    await page.goto(authorizationUrl.href);

    await expect(page.locator("#login #username")).toBeVisible();
    await page.locator("#login #username").fill(username);
    await page.locator("#login #password").fill(password);
    await page.locator("#login button[type=submit]").click();

    await expect(page.locator("#totp #code")).toBeVisible();
    await page.locator("#totp #code").fill(generateTOTP(totpSecret));
    await page.locator("#totp button[type=submit]").click();

    await expect(page).toHaveURL(
      (url) => url.origin === redirectUri.origin && url.pathname === redirectUri.pathname
    );
    const callbackUrl = new URL(page.url());
    expect(callbackUrl.searchParams.get("error")).toBeNull();
    expect(callbackUrl.searchParams.get("code")).toBeTruthy();

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier,
      expectedState: state,
      expectedNonce: nonce,
    });
    expect(tokens.claims()?.sub).toBeTruthy();
  });
});
