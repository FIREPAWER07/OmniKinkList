import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build with its own database (e2e.db),
 * so they never touch local.db. Locally, `PW_CHANNEL=msedge` or `PW_CHANNEL=chrome`
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
    command: process.env.E2E_SKIP_BUILD
      ? `bun run start --port ${PORT}`
      : `bun e2e/prepare-db.ts && bun run build && bun run start --port ${PORT}`,
    url: baseURL,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "file:e2e.db",
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
      BETTER_AUTH_URL: baseURL,
      ADMIN_EMAILS: "admin@e2e.test",
      REQUIRE_EMAIL_VERIFICATION: "false",
      REQUIRE_EDITOR_2FA: "false",
    },
  },
});
