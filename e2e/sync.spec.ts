import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmAge, PASSWORD, signUp, uniqueEmail } from "./helpers";

const PASSPHRASE = "purple otter bakes bread";
const AES_GCM_TAG = 16;

const favorite = (page: Page) => page.getByRole("radiogroup", { name: "Masturbation", exact: true }).getByRole("radio", { name: "Favorite" });

test.beforeEach(async ({ page }) => confirmAge(page));

async function signInOnNewDevice(browser: Browser, email: string) {
  const context = await browser.newContext();
  const device = await context.newPage();
  await confirmAge(device);
  await device.goto("/login");
  await device.getByLabel("Email").fill(email);
  await device.getByLabel("Password").fill(PASSWORD);
  await device.getByRole("button", { name: "Sign in" }).click();
  await expect(device).toHaveURL(/\/account/);
  return { context, device };
}

async function fillPassphrase(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await dialog.getByLabel("Repeat the passphrase").fill(PASSPHRASE);
  await dialog.getByLabel("I understand the passphrase can't be reset.").check();
  return dialog;
}

test("synced answers are uploaded padded and unlock on another device", async ({ page, browser }) => {
  const email = uniqueEmail("sync");
  await signUp(page, email);

  await page.goto("/list/common");
  await favorite(page).click();
  await expect(favorite(page)).toHaveAttribute("aria-checked", "true");

  await page.goto("/account");
  await page.getByRole("button", { name: "Turn on sync" }).click();
  await page.getByRole("dialog").getByLabel("Encrypt with a passphrase").check();
  const dialog = await fillPassphrase(page);
  const upload = page.waitForRequest((request) => request.method() === "POST" && !!request.postData()?.includes('"ciphertext"'));
  await dialog.getByRole("button", { name: "Continue" }).click();

  // The server only sees the size bucket: a single answer uploads as much as a full list would.
  const ciphertext = /"ciphertext":"([^"]+)"/.exec((await upload).postData() ?? "")?.[1] ?? "";
  expect(Buffer.from(ciphertext, "base64").length).toBe(32 * 1024 + AES_GCM_TAG);
  await expect(page.getByText(/Sync is on\. Last synced/)).toBeVisible();
  await expect(page.getByText(/^End-to-end encrypted\./)).toBeVisible();

  const { context, device } = await signInOnNewDevice(browser, email);
  await device.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await device.getByRole("button", { name: "Unlock" }).click();
  await expect(device.getByText(/Sync is on\. Last synced/)).toBeVisible();

  await device.goto("/list/common");
  await expect(favorite(device)).toHaveAttribute("aria-checked", "true");
  await context.close();
});

test("sync without a passphrase works on another device right after signing in", async ({ page, browser }) => {
  const email = uniqueEmail("plain-sync");
  await signUp(page, email);

  await page.goto("/list/common");
  await favorite(page).click();
  await expect(favorite(page)).toHaveAttribute("aria-checked", "true");

  await page.goto("/account");
  await page.getByRole("button", { name: "Turn on sync" }).click();
  const upload = page.waitForRequest((request) => request.method() === "POST" && !!request.postData()?.includes('"snapshot"'));
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  expect((await upload).postData()).not.toContain('"ciphertext"');
  await expect(page.getByText(/Sync is on\. Last synced/)).toBeVisible();
  await expect(page.getByText(/^Not encrypted\./)).toBeVisible();

  const { context, device } = await signInOnNewDevice(browser, email);
  await expect(device.getByText(/Sync is on\. Last synced/)).toBeVisible();
  await expect(device.getByLabel("Passphrase", { exact: true })).toHaveCount(0);

  await device.goto("/list/common");
  await expect(favorite(device)).toHaveAttribute("aria-checked", "true");
  await context.close();
});

test("encryption can be added and removed later, and other devices follow", async ({ page, browser }) => {
  const email = uniqueEmail("toggle-sync");
  await signUp(page, email);

  await page.getByRole("button", { name: "Turn on sync" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/^Not encrypted\./)).toBeVisible();

  const { context, device } = await signInOnNewDevice(browser, email);
  await expect(device.getByText(/^Not encrypted\./)).toBeVisible();

  // Adding a passphrase locks devices that don't know it yet.
  await page.getByRole("button", { name: "Encrypt sync" }).click();
  await (await fillPassphrase(page)).getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/^End-to-end encrypted\./)).toBeVisible();

  await device.reload();
  await device.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await device.getByRole("button", { name: "Unlock" }).click();
  await expect(device.getByText(/^End-to-end encrypted\./)).toBeVisible();

  // A device that used encryption asks before uploading readable answers.
  await page.getByRole("button", { name: "Remove encryption" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove encryption" }).click();
  await expect(page.getByText(/^Not encrypted\./)).toBeVisible();

  await device.reload();
  await expect(device.getByText(/won't upload readable answers until you confirm/)).toBeVisible();
  await device.getByRole("button", { name: "Continue without encryption" }).click();
  await expect(device.getByText(/^Not encrypted\./)).toBeVisible();
  await context.close();
});
