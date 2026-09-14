import { expect, test } from "@playwright/test";
import { confirmAge, PASSWORD, setRole, signUp, uniqueEmail } from "./helpers";

test("an admin can ban a user, which signs them out and blocks signing in until the ban is lifted", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  const member = await (await browser.newContext()).newPage();
  await confirmAge(admin);
  await confirmAge(member);

  const adminEmail = uniqueEmail("moderator");
  await signUp(admin, adminEmail);
  setRole(adminEmail, "admin");
  const memberEmail = uniqueEmail("member");
  const memberName = memberEmail.split("@")[0];
  await signUp(member, memberEmail);

  await admin.goto("/admin/users");
  await admin.getByRole("searchbox", { name: "Search users" }).fill(memberEmail);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin.getByRole("link", { name: memberName }).click();
  await expect(admin.getByRole("heading", { name: memberName })).toBeVisible();
  await expect(admin.getByText("Active sessions (1)")).toBeVisible();

  await admin.getByRole("button", { name: "Ban", exact: true }).click();
  const banDialog = admin.getByRole("dialog");
  await banDialog.getByLabel("Reason").fill("Posting spam in suggestions");
  await banDialog.getByLabel("Length").selectOption("permanent");
  await banDialog.getByRole("button", { name: "Ban user" }).click();
  await expect(admin.getByText("Banned until an admin lifts the ban")).toBeVisible();
  await expect(admin.getByText("Active sessions (0)")).toBeVisible();

  await member.goto("/account");
  await expect(member).toHaveURL(/\/login/);
  await member.getByLabel("Email").fill(memberEmail);
  await member.getByLabel("Password").fill(PASSWORD);
  await member.getByRole("button", { name: "Sign in" }).click();
  await expect(member.getByText("This account is suspended, so you cannot sign in.")).toBeVisible();

  await admin.getByRole("button", { name: "Lift ban" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Lift ban" }).click();
  await expect(admin.getByText(`Lifted the ban on ${memberName}`)).toBeVisible();
  await expect(admin.getByText("Banned until an admin lifts the ban")).toBeHidden();

  await member.getByRole("button", { name: "Sign in" }).click();
  await expect(member).toHaveURL(/\/account/);

  // Nobody gets moderation controls for their own account.
  await admin.goto(`/admin/users?q=${encodeURIComponent(adminEmail)}`);
  await admin.getByRole("link", { name: adminEmail.split("@")[0] }).click();
  await expect(admin.getByText("This is your account.")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Ban", exact: true })).toHaveCount(0);
});
