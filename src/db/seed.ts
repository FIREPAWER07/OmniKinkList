/**
 * Seeds the kink list content from the typed files in `src/db/seed-data`.
 *
 *   bun run db:seed          seed only if there are no lists yet
 *   bun run db:seed --force  wipe all list content and reseed (keeps users)
 *
 * Ids are assigned deterministically so a fresh seed always produces the same
 * choice keys, which keeps share links working across environments.
 */
import { count } from "drizzle-orm";
import { db } from "./index";
import { auditLog, categories, items, lists, options } from "./schema";
import { seedLists } from "./seed-data";

const CHUNK = 200;

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await insert(rows.slice(i, i + CHUNK));
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const [{ value: existing }] = await db.select({ value: count() }).from(lists);

  if (existing > 0 && !force) {
    console.log(`Database already has ${existing} lists, skipping seed (use --force to reseed).`);
    return;
  }

  if (force) {
    console.log("Wiping existing list content...");
    await db.delete(options);
    await db.delete(items);
    await db.delete(categories);
    await db.delete(lists);
  }

  const listRows: (typeof lists.$inferInsert)[] = [];
  const categoryRows: (typeof categories.$inferInsert)[] = [];
  const itemRows: (typeof items.$inferInsert)[] = [];
  const optionRows: (typeof options.$inferInsert)[] = [];
  let categoryId = 0;
  let itemId = 0;
  let optionId = 0;

  seedLists.forEach((list, listIndex) => {
    listRows.push({
      slug: list.slug,
      name: list.name,
      tagline: list.tagline,
      description: list.description,
      sortOrder: listIndex,
    });
    list.categories.forEach((category, categoryIndex) => {
      categoryId++;
      categoryRows.push({
        id: categoryId,
        listSlug: list.slug,
        name: category.name,
        description: category.description ?? "",
        sortOrder: categoryIndex,
      });
      category.items.forEach((item, itemIndex) => {
        itemId++;
        itemRows.push({
          id: itemId,
          categoryId,
          name: item.name,
          description: item.description ?? "",
          sortOrder: itemIndex,
        });
        (item.options ?? []).forEach((label, optionIndex) => {
          optionId++;
          optionRows.push({ id: optionId, itemId, label, sortOrder: optionIndex });
        });
      });
    });
  });

  await insertChunked(listRows, (chunk) => db.insert(lists).values(chunk));
  await insertChunked(categoryRows, (chunk) => db.insert(categories).values(chunk));
  await insertChunked(itemRows, (chunk) => db.insert(items).values(chunk));
  await insertChunked(optionRows, (chunk) => db.insert(options).values(chunk));
  await db.insert(auditLog).values({
    userName: "system",
    action: "seed",
    summary: `Seeded ${listRows.length} lists, ${itemRows.length} items, ${optionRows.length} options`,
  });

  console.log(
    `Seeded ${listRows.length} lists, ${categoryRows.length} categories, ${itemRows.length} items, ${optionRows.length} options.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
