/**
 * Reading the editable (draft) content and publishing it. Shared by the app and the seed script,
 * so no Next.js-only imports here.
 */
import { asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import {
  diffLists,
  entityKey,
  isEmptyChange,
  sameContent,
  stampAddedDates,
  type ListChanges,
  type PublishedData,
  type TranslationMap,
} from "../lib/kinks/published";
import type { KinkItem, OptionKind } from "../lib/kinks/types";
import { db } from "./index";
import { categories, contentTranslations, items, lists, listVersions, options } from "./schema";

/** Rows per statement for bulk inserts and `in (...)` lookups, well under Postgres' parameter limit. */
const CHUNK_SIZE = 200;

/** Runs `run` on consecutive slices of `rows`, one slice at a time, and returns each slice's result. */
export async function inChunks<T, R>(rows: T[], run: (chunk: T[]) => Promise<R>, size = CHUNK_SIZE): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < rows.length; i += size) results.push(await run(rows.slice(i, i + size)));
  return results;
}

/**
 * Moves the id sequences past the highest existing id. Needed after inserting rows with explicit
 * ids (the seed), otherwise the next generated id would collide with one of them.
 */
export async function syncIdSequences() {
  for (const table of ["categories", "items", "options"]) {
    await db.execute(sql.raw(`select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 0) + 1, false)`));
  }
}

/** Builds the full draft tree of a list from the working tables. */
export async function loadDraft(slug: string): Promise<PublishedData | null> {
  const [list] = await db.select().from(lists).where(eq(lists.slug, slug));
  if (!list) return null;

  const categoryRows = await db
    .select()
    .from(categories)
    .where(eq(categories.listSlug, slug))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  const categoryIds = categoryRows.map((c) => c.id);
  const itemRows = categoryIds.length
    ? await db.select().from(items).where(inArray(items.categoryId, categoryIds)).orderBy(asc(items.sortOrder), asc(items.id))
    : [];
  const itemIds = itemRows.map((i) => i.id);
  const optionRows = itemIds.length
    ? await db.select().from(options).where(inArray(options.itemId, itemIds)).orderBy(asc(options.sortOrder), asc(options.id))
    : [];

  const keys = [
    entityKey.list(slug),
    ...categoryIds.map(entityKey.category),
    ...itemIds.map(entityKey.item),
    ...optionRows.map((o) => entityKey.option(o.id)),
  ];
  const translationRows = await inChunks(keys, (chunk) => db.select().from(contentTranslations).where(inArray(contentTranslations.entityKey, chunk)), 400);
  const translations: TranslationMap = {};
  for (const row of translationRows.flat()) {
    ((translations[row.locale] ??= {})[row.entityKey] ??= {})[row.field] = row.value;
  }

  // Rows are already sorted, and grouping keeps that order within each parent.
  const itemsByCategory = Map.groupBy(itemRows, (i) => i.categoryId);
  const optionsByItem = Map.groupBy(optionRows, (o) => o.itemId);

  return {
    slug: list.slug,
    name: list.name,
    tagline: list.tagline,
    description: list.description,
    translations,
    categories: categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      items: (itemsByCategory.get(c.id) ?? []).map(
        (i): KinkItem => ({
          id: i.id,
          name: i.name,
          description: i.description,
          options: (optionsByItem.get(i.id) ?? []).map((o) => ({ id: o.id, label: o.label, kind: o.kind as OptionKind })),
        }),
      ),
    })),
  };
}

export async function loadLatestVersion(slug: string) {
  const [row] = await db
    .select()
    .from(listVersions)
    .where(eq(listVersions.listSlug, slug))
    .orderBy(desc(listVersions.version))
    .limit(1);
  return row ? { ...row, parsed: JSON.parse(row.data) as PublishedData } : null;
}

/** The draft of a list and its live version, loaded together. */
export async function loadDraftAndLatest(slug: string) {
  const [draft, latest] = await Promise.all([loadDraft(slug), loadLatestVersion(slug)]);
  return { draft, latest };
}

/** Whether the draft differs from the live version (always true before the first publish). */
export function hasUnpublishedChanges(draft: PublishedData, latest: { parsed: PublishedData } | null) {
  return !latest || !sameContent(draft, latest.parsed);
}

/** Changes the draft would publish, compared with the live version. */
export function pendingChanges(draft: PublishedData, latest: { parsed: PublishedData } | null): ListChanges {
  return diffLists(latest?.parsed ?? null, draft);
}

export async function publishList(slug: string, actor: { id: string | null; name: string }, note: string) {
  const { draft, latest } = await loadDraftAndLatest(slug);
  if (!draft) throw new Error(`List ${slug} does not exist`);
  const previous = latest?.parsed ?? null;
  const changes = pendingChanges(draft, latest);
  if (previous && isEmptyChange(changes)) return null;

  const [{ value: last }] = await db.select({ value: max(listVersions.version) }).from(listVersions).where(eq(listVersions.listSlug, slug));
  const version = (last ?? 0) + 1;
  const now = new Date();
  stampAddedDates(previous, draft, now.toISOString());
  draft.version = version;
  draft.publishedAt = now.toISOString();

  await db.insert(listVersions).values({
    listSlug: slug,
    version,
    data: JSON.stringify(draft),
    changes: JSON.stringify(changes),
    note,
    publishedById: actor.id,
    publishedByName: actor.name,
    publishedAt: now,
  });
  return { version, changes };
}
