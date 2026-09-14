import { expect, test, type Page } from "@playwright/test";
import { confirmAge, PASSWORD, signUp, uniqueEmail } from "./helpers";

const PASSPHRASE = "purple otter bakes bread";
const AES_GCM_TAG = 16;

const favorite = (page: Page) => page.getByRole("radiogroup", { name: "Masturbation", exact: true }).getByRole("radio", { name: "Favorite" });

test.beforeEach(async ({ page }) => confirmAge(page));

test("synced answers are uploaded padded and unlock on another device", async ({ page, browser }) => {
  const email = uniqueEmail("sync");
  await signUp(page, email);

  await page.goto("/list/common");
  await favorite(page).click();
  await expect(favorite(page)).toHaveAttribute("aria-checked", "true");

  await page.goto("/account");
  await page.getByRole("button", { name: "Turn on sync" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await dialog.getByLabel("Repeat the passphrase").fill(PASSPHRASE);
  await dialog.getByLabel("I understand the passphrase can't be reset.").check();
  const upload = page.waitForRequest((request) => request.method() === "POST" && !!request.postData()?.includes('"ciphertext"'));
  await dialog.getByRole("button", { name: "Continue" }).click();

  // The server only sees the size bucket: a single answer uploads as much as a full list would.
  const ciphertext = /"ciphertext":"([^"]+)"/.exec((await upload).postData() ?? "")?.[1] ?? "";
  expect(Buffer.from(ciphertext, "base64").length).toBe(32 * 1024 + AES_GCM_TAG);
  await expect(page.getByText(/Sync is on\. Last synced/)).toBeVisible();

  const other = await browser.newContext();
  const device = await other.newPage();
  await confirmAge(device);
  await device.goto("/login");
  await device.getByLabel("Email").fill(email);
  await device.getByLabel("Password").fill(PASSWORD);
  await device.getByRole("button", { name: "Sign in" }).click();
  await expect(device).toHaveURL(/\/account/);

  await device.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await device.getByRole("button", { name: "Unlock" }).click();
  await expect(device.getByText(/Sync is on\. Last synced/)).toBeVisible();

  await device.goto("/list/common");
  await expect(favorite(device)).toHaveAttribute("aria-checked", "true");
  await other.close();
});
