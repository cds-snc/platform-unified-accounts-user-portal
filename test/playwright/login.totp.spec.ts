import { expect, test } from "@playwright/test";
import * as oidc from "openid-client";

import { generateTOTP, getRequiredEnv } from "./utils/utils";

test.describe("login user flow", () => {
  let portalUrl: URL;
  let testRedirectUri: URL;
  let testClientId: string;
  let username: string;
  let password: string;
  let totpSecret: string;

  test.beforeAll(() => {
    portalUrl = new URL(getRequiredEnv("PORTAL_URL"));
    testRedirectUri = new URL(getRequiredEnv("TEST_CALLBACK_URL"));
    testClientId = getRequiredEnv("TEST_CLIENT_ID");
    username = getRequiredEnv("USERNAME");
    password = getRequiredEnv("PASSWORD");
    totpSecret = getRequiredEnv("TOTP_SECRET");
  });

  test("logs in with TOTP and lands on the account page", async ({ page }) => {
    await page.goto(portalUrl.href);

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
    const discoveryResponse = await fetch(new URL("/.well-known/openid-configuration", portalUrl));
    expect(discoveryResponse.ok).toBe(true);

    // Transform the discovery response to use the portal URL for all endpoints
    // This is to support using PR review environments with the integration tests
    const serverMetadata = (await discoveryResponse.json()) as oidc.ServerMetadata;
    const proxiedMetadata = Object.fromEntries(
      Object.entries(serverMetadata).map(([key, value]) => {
        if ((key.endsWith("_endpoint") || key.endsWith("_uri")) && typeof value === "string") {
          const endpoint = new URL(value, serverMetadata.issuer);
          endpoint.protocol = portalUrl.protocol;
          endpoint.host = portalUrl.host;
          return [key, endpoint.href];
        }
        return [key, value];
      })
    ) as oidc.ServerMetadata;

    const config = new oidc.Configuration(
      proxiedMetadata,
      testClientId,
      { token_endpoint_auth_method: "none" },
      oidc.None()
    );
    const pkceCodeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(pkceCodeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();

    await page.route(
      (url) => url.origin === testRedirectUri.origin && url.pathname === testRedirectUri.pathname,
      (route) => route.fulfill({ status: 200, body: "OIDC callback received" })
    );

    const authorizationUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: testRedirectUri.href,
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
      (url) => url.origin === testRedirectUri.origin && url.pathname === testRedirectUri.pathname
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
