import { expect, test } from "@playwright/test";
import { confirmAge, PASSWORD, setRole, signUp, uniqueEmail } from "./helpers";

test.beforeEach(async ({ page }) => confirmAge(page));

test("a new account can sign out and back in, but cannot open the editor", async ({ page }) => {
  const email = uniqueEmail("user");
  await signUp(page, email);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Not an editor yet" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account/);
});

test("an editor can change an item and publish it to the public list", async ({ page }) => {
  const email = uniqueEmail("admin");
  await signUp(page, email);
  setRole(email, "admin");

  await page.goto("/admin/lists/common");
  await page.getByRole("button", { name: "Edit Masturbation" }).click();

  const dialog = page.getByRole("dialog");
  const description = "Pleasuring yourself, edited by the end-to-end test.";
  await dialog.getByLabel("Description").fill(description);
  await dialog.getByRole("button", { name: "Save item" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByText("Published version 2")).toBeVisible();

  await page.goto("/list/common");
  await expect(page.getByText(description)).toBeVisible();
});
