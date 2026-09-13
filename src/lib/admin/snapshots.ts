import "server-only";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, contentTranslations, items, lists, options, user } from "@/db/schema";
import type { OptionKind } from "@/lib/kinks/types";
import type { Role } from "@/lib/roles";

/**
 * Snapshots of editable rows, stored in the activity log so any change can be undone.
 * Every restore function takes `null` to mean "this did not exist", which deletes it.
 */

export interface TranslationRow {
  locale: string;
  entityKey: string;
  field: string;
  value: string;
}

export interface ItemSnapshot {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  sortOrder: number;
  options: { id: number; label: string; kind: OptionKind; sortOrder: number }[];
  translations: TranslationRow[];
}

export interface CategorySnapshot {
  id: number;
  listSlug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  translations: TranslationRow[];
}

export interface CategoryTreeSnapshot extends CategorySnapshot {
  items: ItemSnapshot[];
}

export interface ListSnapshot {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  translations: TranslationRow[];
}

export interface OrderSnapshot {
  table: "items" | "categories";
  rows: { id: number; sortOrder: number }[];
}

export interface TranslationSnapshot {
  locale: string;
  entityKey: string;
  field: string;
  value: string | null;
}

export interface RoleSnapshot {
  userId: string;
  role: Role;
}

export type EntityType = "item" | "category" | "categoryTree" | "list" | "order" | "translation" | "role";

async function translationsFor(keys: string[]): Promise<TranslationRow[]> {
  if (keys.length === 0) return [];
  return db.select().from(contentTranslations).where(inArray(contentTranslations.entityKey, keys));
}

async function replaceTranslations(keys: string[], rows: TranslationRow[]) {
  if (keys.length) await db.delete(contentTranslations).where(inArray(contentTranslations.entityKey, keys));
  if (rows.length) await db.insert(contentTranslations).values(rows);
}

/* ------------------------------ Items ------------------------------ */

export async function snapshotItem(id: number): Promise<ItemSnapshot | null> {
  const [item] = await db.select().from(items).where(eq(items.id, id));
  if (!item) return null;
  const optionRows = await db.select().from(options).where(eq(options.itemId, id)).orderBy(asc(options.sortOrder), asc(options.id));
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    sortOrder: item.sortOrder,
    options: optionRows.map((o) => ({ id: o.id, label: o.label, kind: o.kind as OptionKind, sortOrder: o.sortOrder })),
    translations: await translationsFor([`i:${id}`, ...optionRows.map((o) => `o:${o.id}`)]),
  };
}

export async function deleteItemCompletely(id: number) {
  const optionRows = await db.select({ id: options.id }).from(options).where(eq(options.itemId, id));
  await db.delete(contentTranslations).where(inArray(contentTranslations.entityKey, [`i:${id}`, ...optionRows.map((o) => `o:${o.id}`)]));
  await db.delete(items).where(eq(items.id, id));
}

export async function restoreItem(id: number, snapshot: ItemSnapshot | null) {
  if (!snapshot) return deleteItemCompletely(id);
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, snapshot.categoryId));
  if (!category) throw new RestoreError("The category of this item no longer exists. Undo the category change first.");
  const fields = { categoryId: snapshot.categoryId, name: snapshot.name, description: snapshot.description, sortOrder: snapshot.sortOrder };
  await db.insert(items).values({ id: snapshot.id, ...fields }).onConflictDoUpdate({ target: items.id, set: fields });
  const keep = snapshot.options.map((o) => o.id);
  const removed = await db
    .select({ id: options.id })
    .from(options)
    .where(keep.length ? and(eq(options.itemId, id), notInArray(options.id, keep)) : eq(options.itemId, id));
  if (removed.length) {
    await db.delete(options).where(inArray(options.id, removed.map((o) => o.id)));
  }
  for (const option of snapshot.options) {
    const values = { itemId: id, label: option.label, kind: option.kind, sortOrder: option.sortOrder };
    await db.insert(options).values({ id: option.id, ...values }).onConflictDoUpdate({ target: options.id, set: values });
  }
  const keys = [`i:${id}`, ...snapshot.options.map((o) => `o:${o.id}`), ...removed.map((o) => `o:${o.id}`)];
  await replaceTranslations(keys, snapshot.translations);
}

/* ---------------------------- Categories --------------------------- */

export async function snapshotCategory(id: number): Promise<CategorySnapshot | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  if (!row) return null;
  return { ...row, translations: await translationsFor([`c:${id}`]) };
}

export async function snapshotCategoryTree(id: number): Promise<CategoryTreeSnapshot | null> {
  const category = await snapshotCategory(id);
  if (!category) return null;
  const itemRows = await db.select({ id: items.id }).from(items).where(eq(items.categoryId, id)).orderBy(asc(items.sortOrder));
  const snapshots = await Promise.all(itemRows.map((i) => snapshotItem(i.id)));
  return { ...category, items: snapshots.filter((s): s is ItemSnapshot => !!s) };
}

export async function deleteCategoryCompletely(id: number) {
  const itemRows = await db.select({ id: items.id }).from(items).where(eq(items.categoryId, id));
  for (const item of itemRows) await deleteItemCompletely(item.id);
  await db.delete(contentTranslations).where(eq(contentTranslations.entityKey, `c:${id}`));
  await db.delete(categories).where(eq(categories.id, id));
}

export async function restoreCategory(id: number, snapshot: CategorySnapshot | null) {
  if (!snapshot) return deleteCategoryCompletely(id);
  const [list] = await db.select({ slug: lists.slug }).from(lists).where(eq(lists.slug, snapshot.listSlug));
  if (!list) throw new RestoreError("The list of this category no longer exists.");
  const fields = { listSlug: snapshot.listSlug, name: snapshot.name, description: snapshot.description, icon: snapshot.icon, sortOrder: snapshot.sortOrder };
  await db.insert(categories).values({ id: snapshot.id, ...fields }).onConflictDoUpdate({ target: categories.id, set: fields });
  await replaceTranslations([`c:${id}`], snapshot.translations);
}

export async function restoreCategoryTree(id: number, snapshot: CategoryTreeSnapshot | null) {
  if (!snapshot) return deleteCategoryCompletely(id);
  await restoreCategory(id, snapshot);
  for (const item of snapshot.items) await restoreItem(item.id, item);
}

/* ------------------------------ Lists ------------------------------ */

export async function snapshotList(slug: string): Promise<ListSnapshot | null> {
  const [row] = await db.select().from(lists).where(eq(lists.slug, slug));
  if (!row) return null;
  return { slug: row.slug, name: row.name, tagline: row.tagline, description: row.description, translations: await translationsFor([`l:${slug}`]) };
}

export async function restoreList(slug: string, snapshot: ListSnapshot | null) {
  if (!snapshot) throw new RestoreError("Creating or deleting whole lists cannot be undone here.");
  await db.update(lists).set({ name: snapshot.name, tagline: snapshot.tagline, description: snapshot.description }).where(eq(lists.slug, slug));
  await replaceTranslations([`l:${slug}`], snapshot.translations);
}

/* ------------------------------ Other ------------------------------ */

export async function snapshotOrder(table: OrderSnapshot["table"], parent: number | string): Promise<OrderSnapshot> {
  const rows =
    table === "items"
      ? await db.select({ id: items.id, sortOrder: items.sortOrder }).from(items).where(eq(items.categoryId, Number(parent)))
      : await db.select({ id: categories.id, sortOrder: categories.sortOrder }).from(categories).where(eq(categories.listSlug, String(parent)));
  return { table, rows };
}

export async function restoreOrder(snapshot: OrderSnapshot) {
  for (const row of snapshot.rows) {
    if (snapshot.table === "items") await db.update(items).set({ sortOrder: row.sortOrder }).where(eq(items.id, row.id));
    else await db.update(categories).set({ sortOrder: row.sortOrder }).where(eq(categories.id, row.id));
  }
}

export async function snapshotTranslation(locale: string, entityKey: string, field: string): Promise<TranslationSnapshot> {
  const [row] = await db
    .select()
    .from(contentTranslations)
    .where(and(eq(contentTranslations.locale, locale), eq(contentTranslations.entityKey, entityKey), eq(contentTranslations.field, field)));
  return { locale, entityKey, field, value: row?.value ?? null };
}

export async function restoreTranslation(snapshot: TranslationSnapshot) {
  const where = and(
    eq(contentTranslations.locale, snapshot.locale),
    eq(contentTranslations.entityKey, snapshot.entityKey),
    eq(contentTranslations.field, snapshot.field),
  );
  if (snapshot.value === null || snapshot.value === "") {
    await db.delete(contentTranslations).where(where);
    return;
  }
  const row = { locale: snapshot.locale, entityKey: snapshot.entityKey, field: snapshot.field, value: snapshot.value };
  await db
    .insert(contentTranslations)
    .values(row)
    .onConflictDoUpdate({ target: [contentTranslations.locale, contentTranslations.entityKey, contentTranslations.field], set: { value: row.value } });
}

export async function restoreRole(snapshot: RoleSnapshot) {
  await db.update(user).set({ role: snapshot.role }).where(eq(user.id, snapshot.userId));
}

export class RestoreError extends Error {}
