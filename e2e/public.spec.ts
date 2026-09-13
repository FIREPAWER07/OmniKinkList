import path from "node:path";
import { expect, test } from "@playwright/test";
import { confirmAge } from "./helpers";

test("age gate blocks the site until confirmed", async ({ page }) => {
  await page.goto("/");
  const gate = page.getByRole("dialog", { name: "This site is for adults" });
  await expect(gate).toBeVisible();
  await gate.getByRole("button", { name: "I am 18 or older" }).click();
  await expect(gate).toBeHidden();

  await page.reload();
  await expect(page.getByRole("link", { name: /Common/ }).first()).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test.describe("answering", () => {
  test.beforeEach(async ({ page }) => confirmAge(page));

  test("answers are saved, shown in results, and survive a share link", async ({ page, browser }) => {
    await page.goto("/list/common");
    const rater = page.getByRole("radiogroup", { name: "Masturbation", exact: true });
    const favorite = rater.getByRole("radio", { name: "Favorite" });
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-checked", "true");

    await page.reload();
    await expect(favorite).toHaveAttribute("aria-checked", "true");

    // Clicking the same answer again clears it.
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-checked", "false");
    await rater.getByRole("radio", { name: "Hard limit" }).click();

    await page.goto("/list/common/results");
    await expect(page.getByRole("heading", { name: "Your Common results" })).toBeVisible();
    await expect(page.getByText("Masturbation").first()).toBeVisible();

    await page.getByRole("button", { name: "Share link" }).click();
    const link = await page.getByRole("textbox", { name: "Share link" }).inputValue();
    expect(link).toContain("/s#");

    // A separate browser context has no local answers, so everything comes from the link.
    const other = await browser.newContext();
    const shared = await other.newPage();
    await confirmAge(shared);
    await shared.goto(link);
    await expect(shared.getByText("Shared with you")).toBeVisible();
    await expect(shared.getByText("Masturbation").first()).toBeVisible();
    await other.close();
  });

  test("search filters the list", async ({ page }) => {
    await page.goto("/list/common");
    await page.getByRole("searchbox", { name: "Search items" }).fill("tickl");
    await expect(page.getByRole("radiogroup", { name: /^Tickling/ }).first()).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Masturbation", exact: true })).toBeHidden();
  });

  test("an export from the old site can be imported", async ({ page }) => {
    await page.goto("/import");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "v1-uncommon-export.html"));
    await expect(page.getByRole("heading", { name: "Export from the old site" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Matched" }).locator("+ dd")).not.toHaveText("0");
    await page.getByRole("button", { name: "Import answers" }).click();
    await expect(page).toHaveURL(/\/list\/[a-z]+$/);
    await expect(page.locator('[role="radio"][aria-checked="true"]').first()).toBeVisible();
  });

  test("answers handed over by the old site's redirect can be imported", async ({ page }) => {
    // Same payload the redirect pages on the redirect-to-netlify branch build from localStorage.
    const payload = { type: "common", prefs: { Masturbation: { level: "favorite" }, "Oral sex_Receiving": { level: "like" } } };
    await page.goto(`/import#v1=${Buffer.from(JSON.stringify(payload)).toString("base64url")}`);
    await expect(page.getByRole("heading", { name: "Answers from the old site" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Matched" }).locator("+ dd")).toHaveText("2");
    await expect(page).not.toHaveURL(/#v1=/);
  });
});

test.describe("languages", () => {
  test.beforeEach(async ({ page }) => confirmAge(page));

  test("prefixed routes render translated pages", async ({ page }) => {
    await page.goto("/it/list/common");
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.getByRole("radio", { name: "Preferito" }).first()).toBeVisible();
  });

  test("the English prefix redirects to the unprefixed URL", async ({ page }) => {
    await page.goto("/en/import");
    await expect(page).toHaveURL(/\/import$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
