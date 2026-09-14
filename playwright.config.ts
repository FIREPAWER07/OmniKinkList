import { defineConfig, devices } from "@playwright/test";
import { E2E_EMAIL_OUTBOX } from "./e2e/env";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build with its own in-memory database
 * (see e2e/server.ts), so they never touch your local or production data. Locally, `PW_CHANNEL=msedge` or `PW_CHANNEL=chrome`
 * uses an installed browser instead of downloading one.
 */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL } }],
  webServer: {
    command: `bun e2e/server.ts ${PORT}`,
    url: baseURL,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
      BETTER_AUTH_URL: baseURL,
      REQUIRE_EMAIL_VERIFICATION: "false",
      REQUIRE_EDITOR_2FA: "false",
      EMAIL_OUTBOX: E2E_EMAIL_OUTBOX,
    },
  },
});
