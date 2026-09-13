import type { Page } from "@playwright/test";

/** Skips the 18+ dialog, which is covered by its own test. */
export async function confirmAge(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("okl:age-confirmed", "1"));
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
}
