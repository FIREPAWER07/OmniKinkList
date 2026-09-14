import { expect, test } from "@playwright/test";
import { confirmAge, signUp, uniqueEmail } from "./helpers";

test("a profile is visible to anyone with the link until its owner makes it private", async ({ page, browser }) => {
  await confirmAge(page);
  const email = uniqueEmail("profile");
  const name = email.split("@")[0];
  const username = `p_${Date.now().toString(36)}`;
  const bio = "Here for the end-to-end tests.";
  await signUp(page, email);

  await page.getByLabel("Username", { exact: true }).fill(username.toUpperCase());
  await page.getByLabel("Bio").fill(bio);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  // Usernames are saved in lowercase.
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(username);

  await page.getByRole("link", { name: "View profile" }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${username}$`));
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: bio })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Your profile is public. Anyone with the link can see it." })).toBeVisible();

  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await confirmAge(visitor);
  await visitor.goto(`/u/${username}`);
  await expect(visitor.getByRole("heading", { name })).toBeVisible();
  await expect(visitor.getByRole("paragraph").filter({ hasText: bio })).toBeVisible();
  await expect(visitor.getByText(`@${username}`, { exact: true })).toBeVisible();
  await expect(visitor.getByText(email)).toHaveCount(0);
  await expect(visitor.getByRole("link", { name: "Edit profile" })).toHaveCount(0);

  await page.getByRole("link", { name: "Edit profile" }).click();
  await page.getByLabel("Public profile").uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Retried: the "Saved" toast from the first save may still be showing.
  await expect(async () => {
    await visitor.reload();
    await expect(visitor.getByRole("heading", { name: "Page not found" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(visitor.getByRole("paragraph").filter({ hasText: bio })).toHaveCount(0);

  await page.goto(`/u/${username}`);
  await expect(page.getByRole("status").filter({ hasText: "Your profile is private. Only you can see this page." })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: bio })).toBeVisible();

  // Someone else can't take the same username.
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await confirmAge(other);
  await signUp(other, uniqueEmail("profile-other"));
  await other.getByLabel("Username", { exact: true }).fill(username);
  await other.getByRole("button", { name: "Save", exact: true }).click();
  await expect(other.getByText("That username is already taken.")).toBeVisible();

  await visitorContext.close();
  await otherContext.close();
});
