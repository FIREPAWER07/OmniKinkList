import { expect, test } from "@playwright/test";
import { confirmAge, PASSWORD, sentEmails, signUp, uniqueEmail } from "./helpers";

test.beforeEach(async ({ page }) => confirmAge(page));

/** Waits for a new email to `to` and returns the code in it. */
async function nextCode(to: string, sentBefore: number) {
  await expect.poll(() => sentEmails(to).length).toBeGreaterThan(sentBefore);
  const email = sentEmails(to).at(-1)!;
  expect(email.subject).toBe("Your OmniKinkList security code");
  return email.text.match(/^\d{6}$/m)![0];
}

test("two-factor authentication with emailed codes", async ({ page }) => {
  const email = uniqueEmail("email2fa");
  await signUp(page, email);

  // Turning it on needs a code sent to the address, so it can't lock anyone out.
  await page.getByRole("radio", { name: /^Email/ }).check();
  await page.getByRole("button", { name: "Turn on", exact: true }).click();
  await expect(page.getByText(`We sent a 6-digit code to ${email}.`)).toBeVisible();
  await page.getByLabel("Code", { exact: true }).fill(await nextCode(email, 0));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText(`Codes are sent to ${email}.`)).toBeVisible();
  await expect(page.getByRole("button", { name: "New backup codes" })).toHaveCount(0);

  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  const sentBefore = sentEmails(email).length;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/two-factor\?method=email/);
  await expect(page.getByText("We emailed you a 6-digit code.")).toBeVisible();
  const code = await nextCode(email, sentBefore);

  await page.getByLabel("Code", { exact: true }).fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "That code is not valid." })).toBeVisible();

  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByText(`Codes are sent to ${email}.`)).toBeVisible();
});
