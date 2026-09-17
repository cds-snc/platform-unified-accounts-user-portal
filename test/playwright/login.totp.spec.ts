import { expect, test } from "@playwright/test";

import { generateTOTP, getRequiredEnv } from "./utils/utils";

test.describe("login user flow", () => {
  let formsUrl = "";
  let portalUrl = "";
  let username = "";
  let password = "";
  let totpSecret = "";

  test.beforeAll(() => {
    formsUrl = getRequiredEnv("FORMS_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    username = getRequiredEnv("USERNAME");
    password = getRequiredEnv("PASSWORD");
    totpSecret = getRequiredEnv("TOTP_SECRET");
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

  test("logs in with TOTP and lands on the Forms policy page", async ({ page }) => {
    await page.goto(`${formsUrl}/en/auth/login`);
    await page
      .getByTestId("gc-platform-migration-panel")
      .getByRole("button", { name: "Sign in with GC Platform" })
      .click();

    await expect(page.locator("#login #username")).toBeVisible();
    await page.locator("#login #username").fill(username);
    await page.locator("#login #password").fill(password);
    await page.locator("#login button[type=submit]").click();

    await expect(page.locator("#totp #code")).toBeVisible();
    await page.locator("#totp #code").fill(generateTOTP(totpSecret));
    await page.locator("#totp button[type=submit]").click();

    await expect(page).toHaveURL(/\/en\/auth\/policy$/);
  });
});
