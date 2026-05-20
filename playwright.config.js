const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./test/playwright",
  timeout: 60000,
  expect: {
    timeout: 20000,
  },
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    headless: true,
    trace: "on-first-retry",
    extraHTTPHeaders: {
      "waf-geo-restriction-bypass": `${process.env.WAF_GEO_RESTRICTION_BYPASS ?? ""}`,
    },
  },
});
