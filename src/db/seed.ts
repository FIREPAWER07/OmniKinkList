/**
 * Seeds the kink list content from the typed files in `src/db/seed-data` and publishes version 1.
 *
 *   bun run db:seed          seed only if there are no lists yet
 *   bun run db:seed --force  wipe all list content, versions and translations, then reseed (keeps users)
 *
 * Ids come from the seed files when present, otherwise they are assigned in order, so a fresh
 * seed always produces the same choice keys and share links keep working across environments.
 */
import { count } from "drizzle-orm";
import type { SeedList } from "../lib/kinks/types";
import { publishList } from "./content";
import { db } from "./index";
import { auditLog, categories, contentTranslations, items, lists, listVersions, options } from "./schema";
import { seedLists } from "./seed-data";
import { seedTranslations } from "./seed-data/translations";

const CHUNK = 200;

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

export function buildSeedRows(seed: SeedList[]) {
  const listRows: (typeof lists.$inferInsert)[] = [];
  const categoryRows: (typeof categories.$inferInsert)[] = [];
  const itemRows: (typeof items.$inferInsert)[] = [];
  const optionRows: (typeof options.$inferInsert)[] = [];
  let categoryId = Math.max(0, ...seed.flatMap((l) => l.categories.map((c) => c.id ?? 0)));
  let itemId = Math.max(0, ...seed.flatMap((l) => l.categories.flatMap((c) => c.items.map((i) => i.id ?? 0))));
  let optionId = Math.max(0, ...seed.flatMap((l) => l.categories.flatMap((c) => c.items.flatMap((i) => i.optionIds ?? []))));

  seed.forEach((list, listIndex) => {
    listRows.push({ slug: list.slug, name: list.name, tagline: list.tagline, description: list.description, sortOrder: listIndex });
    list.categories.forEach((category, categoryIndex) => {
      const cid = category.id ?? ++categoryId;
      categoryRows.push({
        id: cid,
        listSlug: list.slug,
        name: category.name,
        description: category.description ?? "",
        icon: category.icon ?? "sparkle",
        sortOrder: categoryIndex,
      });
      category.items.forEach((item, itemIndex) => {
        const iid = item.id ?? ++itemId;
        itemRows.push({ id: iid, categoryId: cid, name: item.name, description: item.description ?? "", sortOrder: itemIndex });
        const labeled = [
          ...(item.roles ?? []).map((label) => ({ label, kind: "role" as const })),
          ...(item.variants ?? []).map((label) => ({ label, kind: "variant" as const })),
        ];
        labeled.forEach((option, optionIndex) => {
          const oid = item.optionIds?.[optionIndex] ?? ++optionId;
          optionRows.push({ id: oid, itemId: iid, label: option.label, kind: option.kind, sortOrder: optionIndex });
        });
      });
    });
  });
  return { listRows, categoryRows, itemRows, optionRows };
}

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
  await insertChunked(listRows, (chunk) => db.insert(lists).values(chunk));
  await insertChunked(categoryRows, (chunk) => db.insert(categories).values(chunk));
  await insertChunked(itemRows, (chunk) => db.insert(items).values(chunk));
  await insertChunked(optionRows, (chunk) => db.insert(options).values(chunk));
  await insertChunked(seedTranslations, (chunk) => db.insert(contentTranslations).values(chunk));

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

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
