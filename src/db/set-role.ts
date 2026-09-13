/**
 * Changes a user's role from the command line. Useful to create the first admin.
 *
 *   bun run user:role someone@example.com admin
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { ROLES, user, type Role } from "./schema";

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as Role)) {
    console.error(`Usage: bun run user:role <email> <${ROLES.join("|")}>`);
    process.exit(1);
  }
  const updated = await db
    .update(user)
    .set({ role: role as Role })
    .where(eq(user.email, email.toLowerCase()))
    .returning({ id: user.id });
  if (updated.length === 0) {
    console.error(`No user with email ${email}. Sign up on the site first.`);
    process.exit(1);
  }
  console.log(`${email} is now ${role}.`);
}

main();
