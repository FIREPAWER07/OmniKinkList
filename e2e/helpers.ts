import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import type { Role } from "../src/lib/roles";

export const PASSWORD = "correct-horse-battery";

/** Skips the 18+ dialog, which is covered by its own test. */
export async function confirmAge(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("okl:age-confirmed", "1"));
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
}

/** Changes a role the same way an operator would, with `bun run user:role` against e2e.db. */
export function setRole(email: string, role: Role) {
  execFileSync("bun", ["run", "user:role", email, role], {
    env: { ...process.env, DATABASE_URL: "file:e2e.db" },
    stdio: "pipe",
  });
}

export async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
}
