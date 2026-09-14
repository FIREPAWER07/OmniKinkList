import type { SeedList } from "../lib/kinks/types";
import type { categories, items, lists, options } from "./schema";

/**
 * Ids come from the seed files when present, otherwise they are assigned in order, so a fresh
 * seed always produces the same choice keys and share links keep working across environments.
 */
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
