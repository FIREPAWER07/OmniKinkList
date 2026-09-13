import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { lists, listVersions } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { localizeList, type ListChanges, type PublishedData } from "./published";
import type { KinkList, KinkListSummary } from "./types";

/** Invalidated when a list is published or deleted. */
export const LISTS_TAG = "lists";

/** The latest published version of every list, translated. Drafts never show up here. */
export async function getPublishedLists(locale: Locale): Promise<KinkList[]> {
  "use cache";
  cacheLife("max");
  cacheTag(LISTS_TAG);
  const rows = await db
    .select({ data: listVersions.data })
    .from(listVersions)
    .innerJoin(lists, eq(lists.slug, listVersions.listSlug))
    .where(
      sql`${listVersions.version} = (select max(v2.version) from list_versions v2 where v2.list_slug = ${listVersions.listSlug})`,
    )
    .orderBy(asc(lists.sortOrder), asc(lists.name));
  return rows.map((row) => localizeList(JSON.parse(row.data) as PublishedData, locale));
}

export async function getList(slug: string, locale: Locale): Promise<KinkList | null> {
  const all = await getPublishedLists(locale);
  return all.find((l) => l.slug === slug) ?? null;
}

export function summarize(list: KinkList): KinkListSummary {
  const itemsFlat = list.categories.flatMap((c) => c.items);
  return {
    slug: list.slug,
    name: list.name,
    tagline: list.tagline,
    description: list.description,
    categoryCount: list.categories.length,
    itemCount: itemsFlat.length,
    choiceCount: itemsFlat.reduce((n, i) => n + Math.max(1, i.options.length), 0),
    addedDates: itemsFlat.flatMap((i) => [i.addedAt, ...i.options.map((o) => o.addedAt)]).filter((d): d is string => !!d),
  };
}

export async function getListSummaries(locale: Locale): Promise<KinkListSummary[]> {
  return (await getPublishedLists(locale)).map(summarize);
}

export interface ChangelogEntry {
  listSlug: string;
  listName: string;
  version: number;
  note: string;
  publishedAt: string;
  changes: ListChanges;
}

/** Public history of published versions, newest first. */
export async function getChangelog(locale: Locale, limit = 60): Promise<ChangelogEntry[]> {
  "use cache";
  cacheLife("max");
  cacheTag(LISTS_TAG);
  const [rows, published] = await Promise.all([
    db
      .select({
        listSlug: listVersions.listSlug,
        version: listVersions.version,
        note: listVersions.note,
        publishedAt: listVersions.publishedAt,
        changes: listVersions.changes,
      })
      .from(listVersions)
      .orderBy(desc(listVersions.publishedAt), desc(listVersions.id))
      .limit(limit),
    getPublishedLists(locale),
  ]);
  const names = new Map(published.map((l) => [l.slug, l.name]));
  return rows
    .filter((row) => names.has(row.listSlug))
    .map((row) => ({
      listSlug: row.listSlug,
      listName: names.get(row.listSlug)!,
      version: row.version,
      note: row.note,
      publishedAt: row.publishedAt.toISOString(),
      changes: JSON.parse(row.changes) as ListChanges,
    }));
}
