import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import type { Role } from "../src/lib/roles";
import { E2E_DATABASE_URL, E2E_EMAIL_OUTBOX } from "./env";

export const PASSWORD = "correct-horse-battery";

/** Skips the 18+ dialog, which is covered by its own test. */
export async function confirmAge(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("okl:age-confirmed", "1"));
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
}

/** Changes a role the same way an operator would, with `bun run user:role` against the e2e database. */
export function setRole(email: string, role: Role) {
  execFileSync("bun", ["run", "user:role", email, role], {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
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

/** Emails the app has sent to `to`, oldest first. */
export function sentEmails(to: string): { subject: string; text: string }[] {
  if (!existsSync(E2E_EMAIL_OUTBOX)) return [];
  return readFileSync(E2E_EMAIL_OUTBOX, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((email) => email.to === to);
}
