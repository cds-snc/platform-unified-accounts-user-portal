import { expect, test } from "@playwright/test";

import { getRequiredEnv } from "./utils/utils";

test("skip link moves keyboard focus to the main content", async ({ page }) => {
  await page.goto(getRequiredEnv("PORTAL_URL"));

  const skipLink = page.locator("#skip-link");
  const main = page.locator("main#content");

  await expect(skipLink).toBeAttached();
  await expect(main).toBeVisible();
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#content$/);
  await expect(main).toBeFocused();
});
