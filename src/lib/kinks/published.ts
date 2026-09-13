import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import type { KinkList } from "./types";

/** `{ it: { "i:12": { name: "Baci", description: "..." } } }` */
export type TranslationMap = Record<string, Record<string, Record<string, string>>>;

/** The JSON stored in each published version. */
export interface PublishedData extends KinkList {
  translations: TranslationMap;
}

export const entityKey = {
  list: (slug: string) => `l:${slug}`,
  category: (id: number) => `c:${id}`,
  item: (id: number) => `i:${id}`,
  option: (id: number) => `o:${id}`,
};

/** Applies translations for a locale, falling back to English for anything missing. */
export function localizeList(data: PublishedData, locale: Locale): KinkList {
  const t = locale === DEFAULT_LOCALE ? undefined : data.translations?.[locale];
  const pick = (key: string, field: string, fallback: string) => t?.[key]?.[field]?.trim() || fallback;
  return {
    slug: data.slug,
    name: pick(entityKey.list(data.slug), "name", data.name),
    tagline: pick(entityKey.list(data.slug), "tagline", data.tagline),
    description: pick(entityKey.list(data.slug), "description", data.description),
    version: data.version,
    publishedAt: data.publishedAt,
    categories: data.categories.map((category) => ({
      ...category,
      name: pick(entityKey.category(category.id), "name", category.name),
      description: pick(entityKey.category(category.id), "description", category.description),
      items: category.items.map((item) => ({
        ...item,
        name: pick(entityKey.item(item.id), "name", item.name),
        description: pick(entityKey.item(item.id), "description", item.description),
        options: item.options.map((option) => ({
          ...option,
          label: pick(entityKey.option(option.id), "label", option.label),
        })),
      })),
    })),
  };
}

export interface NamedRef {
  id: number;
  name: string;
}

export interface ListChanges {
  addedCategories: NamedRef[];
  removedCategories: NamedRef[];
  addedItems: (NamedRef & { category: string })[];
  removedItems: (NamedRef & { category: string })[];
  renamedItems: (NamedRef & { from: string })[];
  editedItems: NamedRef[];
  addedOptions: (NamedRef & { item: string; itemId: number })[];
  removedOptions: (NamedRef & { item: string; itemId: number })[];
  translatedLocales: string[];
  detailsChanged: boolean;
}

export function isEmptyChange(changes: ListChanges) {
  return (
    !changes.detailsChanged &&
    changes.translatedLocales.length === 0 &&
    [
      changes.addedCategories,
      changes.removedCategories,
      changes.addedItems,
      changes.removedItems,
      changes.renamedItems,
      changes.editedItems,
      changes.addedOptions,
      changes.removedOptions,
    ].every((list) => list.length === 0)
  );
}

/** What changed between two versions of a list. `previous` is null for the first publish. */
export function diffLists(previous: PublishedData | null, next: PublishedData): ListChanges {
  const changes: ListChanges = {
    addedCategories: [],
    removedCategories: [],
    addedItems: [],
    removedItems: [],
    renamedItems: [],
    editedItems: [],
    addedOptions: [],
    removedOptions: [],
    translatedLocales: [],
    detailsChanged: false,
  };

  const prevCategories = new Map((previous?.categories ?? []).map((c) => [c.id, c]));
  const nextCategories = new Map(next.categories.map((c) => [c.id, c]));
  const prevItems = new Map((previous?.categories ?? []).flatMap((c) => c.items.map((i) => [i.id, { item: i, category: c.name }] as const)));
  const nextItems = new Map(next.categories.flatMap((c) => c.items.map((i) => [i.id, { item: i, category: c.name }] as const)));

  if (previous) {
    changes.detailsChanged =
      previous.name !== next.name || previous.tagline !== next.tagline || previous.description !== next.description;
  }

  for (const [id, c] of nextCategories) if (!prevCategories.has(id)) changes.addedCategories.push({ id, name: c.name });
  for (const [id, c] of prevCategories) if (!nextCategories.has(id)) changes.removedCategories.push({ id, name: c.name });

  for (const [id, { item, category }] of nextItems) {
    const before = prevItems.get(id);
    if (!before) {
      changes.addedItems.push({ id, name: item.name, category });
      continue;
    }
    if (before.item.name !== item.name) changes.renamedItems.push({ id, name: item.name, from: before.item.name });
    const prevOptions = new Map(before.item.options.map((o) => [o.id, o]));
    const nextOptions = new Map(item.options.map((o) => [o.id, o]));
    for (const [oid, o] of nextOptions) if (!prevOptions.has(oid)) changes.addedOptions.push({ id: oid, name: o.label, item: item.name, itemId: id });
    for (const [oid, o] of prevOptions) if (!nextOptions.has(oid)) changes.removedOptions.push({ id: oid, name: o.label, item: item.name, itemId: id });
    const optionsEdited = item.options.some((o) => {
      const p = prevOptions.get(o.id);
      return p && (p.label !== o.label || p.kind !== o.kind);
    });
    if (before.item.description !== item.description || optionsEdited) changes.editedItems.push({ id, name: item.name });
  }
  for (const [id, { item, category }] of prevItems) if (!nextItems.has(id)) changes.removedItems.push({ id, name: item.name, category });

  const locales = new Set([...Object.keys(previous?.translations ?? {}), ...Object.keys(next.translations ?? {})]);
  for (const locale of locales) {
    if (JSON.stringify(previous?.translations?.[locale] ?? {}) !== JSON.stringify(next.translations?.[locale] ?? {})) {
      changes.translatedLocales.push(locale);
    }
  }
  return changes;
}

/** Compares content only, ignoring publish metadata and `addedAt` stamps. */
export function sameContent(a: PublishedData, b: PublishedData) {
  const strip = (data: PublishedData) =>
    JSON.stringify({
      ...data,
      version: undefined,
      publishedAt: undefined,
      categories: data.categories.map((c) => ({
        ...c,
        items: c.items.map((i) => ({ ...i, addedAt: undefined, options: i.options.map((o) => ({ ...o, addedAt: undefined })) })),
      })),
    });
  return strip(a) === strip(b);
}

/** Copies `addedAt` from the previous version and stamps anything new with `now`. */
export function stampAddedDates(previous: PublishedData | null, next: PublishedData, now: string) {
  const prevItems = new Map((previous?.categories ?? []).flatMap((c) => c.items.map((i) => [i.id, i] as const)));
  for (const category of next.categories) {
    for (const item of category.items) {
      const before = prevItems.get(item.id);
      item.addedAt = before?.addedAt ?? now;
      const prevOptions = new Map((before?.options ?? []).map((o) => [o.id, o]));
      for (const option of item.options) option.addedAt = prevOptions.get(option.id)?.addedAt ?? (before ? now : item.addedAt);
    }
  }
}
