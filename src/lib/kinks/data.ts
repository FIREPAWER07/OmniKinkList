import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { categories, items, lists, options } from "@/db/schema";
import type { KinkList, KinkListSummary } from "./types";

export const LISTS_TAG = "lists";

/** Loads every list with its full tree in four queries. */
async function loadAllLists(): Promise<KinkList[]> {
  const [listRows, categoryRows, itemRows, optionRows] = await Promise.all([
    db.select().from(lists).orderBy(asc(lists.sortOrder), asc(lists.name)),
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select().from(items).orderBy(asc(items.sortOrder), asc(items.id)),
    db.select().from(options).orderBy(asc(options.sortOrder), asc(options.id)),
  ]);

  const optionsByItem = new Map<number, { id: number; label: string }[]>();
  for (const o of optionRows) {
    const bucket = optionsByItem.get(o.itemId) ?? [];
    bucket.push({ id: o.id, label: o.label });
    optionsByItem.set(o.itemId, bucket);
  }

  const itemsByCategory = new Map<number, KinkList["categories"][number]["items"]>();
  for (const i of itemRows) {
    const bucket = itemsByCategory.get(i.categoryId) ?? [];
    bucket.push({ id: i.id, name: i.name, description: i.description, options: optionsByItem.get(i.id) ?? [] });
    itemsByCategory.set(i.categoryId, bucket);
  }

  const categoriesByList = new Map<string, KinkList["categories"]>();
  for (const c of categoryRows) {
    const bucket = categoriesByList.get(c.listSlug) ?? [];
    bucket.push({ id: c.id, name: c.name, description: c.description, items: itemsByCategory.get(c.id) ?? [] });
    categoriesByList.set(c.listSlug, bucket);
  }

  return listRows.map((l) => ({
    slug: l.slug,
    name: l.name,
    tagline: l.tagline,
    description: l.description,
    categories: categoriesByList.get(l.slug) ?? [],
  }));
}

export async function getAllLists(): Promise<KinkList[]> {
  "use cache";
  cacheLife("max");
  cacheTag(LISTS_TAG);
  return loadAllLists();
}

export async function getList(slug: string): Promise<KinkList | null> {
  const all = await getAllLists();
  return all.find((l) => l.slug === slug) ?? null;
}

export async function getListSummaries(): Promise<KinkListSummary[]> {
  const all = await getAllLists();
  return all.map((l) => ({
    slug: l.slug,
    name: l.name,
    tagline: l.tagline,
    description: l.description,
    categoryCount: l.categories.length,
    itemCount: l.categories.reduce((n, c) => n + c.items.length, 0),
    choiceCount: l.categories.reduce(
      (n, c) => n + c.items.reduce((m, i) => m + Math.max(1, i.options.length), 0),
      0,
    ),
  }));
}
