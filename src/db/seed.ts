/**
 * Seeds the kink list content from the typed files in `src/db/seed-data` and publishes version 1.
 *
 *   bun run db:seed          seed only if there are no lists yet
 *   bun run db:seed --force  wipe all list content, versions and translations, then reseed (keeps users)
 */
import { count } from "drizzle-orm";
import { inChunks, publishList, syncIdSequences } from "./content";
import { closeDb, db } from "./index";
import { auditLog, categories, contentTranslations, items, lists, listVersions, options } from "./schema";
import { buildSeedRows } from "./seed-rows";
import { seedLists } from "./seed-data";
import { seedTranslations } from "./seed-data/translations";

async function main() {
  const force = process.argv.includes("--force");
  const [{ value: existing }] = await db.select({ value: count() }).from(lists);

  if (existing > 0 && !force) {
    console.log(`Database already has ${existing} lists, skipping seed (use --force to reseed).`);
    return;
  }

  if (force) {
    console.log("Wiping list content, versions, and translations...");
    await db.delete(listVersions);
    await db.delete(contentTranslations);
    await db.delete(options);
    await db.delete(items);
    await db.delete(categories);
    await db.delete(lists);
  }

  const { listRows, categoryRows, itemRows, optionRows } = buildSeedRows(seedLists);
  await inChunks(listRows, (chunk) => db.insert(lists).values(chunk));
  await inChunks(categoryRows, (chunk) => db.insert(categories).values(chunk));
  await inChunks(itemRows, (chunk) => db.insert(items).values(chunk));
  await inChunks(optionRows, (chunk) => db.insert(options).values(chunk));
  await inChunks(seedTranslations, (chunk) => db.insert(contentTranslations).values(chunk));
  await syncIdSequences();

  for (const list of listRows) {
    await publishList(list.slug, { id: null, name: "system" }, "First version");
  }
  await db.insert(auditLog).values({
    userName: "system",
    action: "seed",
    summary: `Seeded and published ${listRows.length} lists, ${itemRows.length} items, ${optionRows.length} options`,
  });

  console.log(
    `Seeded ${listRows.length} lists, ${categoryRows.length} categories, ${itemRows.length} items, ${optionRows.length} options, ${seedTranslations.length} translations.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
