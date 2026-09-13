import { itemKey, optionKey } from "./choices";
import { NEGATIVE_LEVELS, POSITIVE_LEVELS, type Experience, type KinkItem, type KinkList, type Level, type ListData } from "./types";

export type CompareBucket = "conflict" | "match" | "curious" | "talk";
export const BUCKET_ORDER: CompareBucket[] = ["match", "curious", "talk", "conflict"];

export interface CompareSide {
  level?: Level;
  experience?: Experience;
}

export interface CompareRow {
  key: string;
  label: string | null;
  kind: "role" | "variant" | "single";
  a: CompareSide;
  b: CompareSide;
}

export interface CompareItem {
  item: KinkItem;
  category: string;
  bucket: CompareBucket;
  /** Complementary role pairs that both enjoy, like "Giving" + "Receiving". */
  rolePairs: [string, string][];
  rows: CompareRow[];
}

const positive = (level?: Level) => !!level && POSITIVE_LEVELS.includes(level);
const negative = (level?: Level) => !!level && NEGATIVE_LEVELS.includes(level);
const neutral = (level?: Level) => level === "maybe" || level === "indifferent";

/** Roles anyone can share with anyone ("Switch", "Mutual (69)"), instead of needing the opposite role. */
const SHARED_ROLE = /mutual|switch|together|both|69/i;

function compatible(a: CompareRow, b: CompareRow) {
  return a.key !== b.key || SHARED_ROLE.test(a.label ?? "");
}

function classify(rows: CompareRow[]): { bucket: CompareBucket | null; rolePairs: [string, string][] } {
  const roles = rows.filter((r) => r.kind === "role");
  const direct = rows.filter((r) => r.kind !== "role");
  const rolePairs: [string, string][] = [];
  let conflict = false;
  let match = false;
  let curious = false;
  let talk = false;

  for (const x of roles) {
    for (const y of roles) {
      if (!compatible(x, y)) continue;
      if (positive(x.a.level) && positive(y.b.level)) {
        match = true;
        rolePairs.push([x.label ?? "", y.label ?? ""]);
      }
      if ((positive(x.a.level) && negative(y.b.level)) || (negative(x.a.level) && positive(y.b.level))) conflict = true;
      if ((positive(x.a.level) && neutral(y.b.level)) || (neutral(x.a.level) && positive(y.b.level))) talk = true;
      if (x.a.experience === "want" && (y.b.experience === "want" || positive(y.b.level))) curious = true;
      if (y.b.experience === "want" && positive(x.a.level)) curious = true;
    }
  }

  for (const r of direct) {
    if (positive(r.a.level) && positive(r.b.level)) match = true;
    if ((positive(r.a.level) && negative(r.b.level)) || (negative(r.a.level) && positive(r.b.level))) conflict = true;
    if ((positive(r.a.level) && neutral(r.b.level)) || (neutral(r.a.level) && positive(r.b.level))) talk = true;
    if (r.a.experience === "want" && r.b.experience === "want") curious = true;
    if ((r.a.experience === "want" && positive(r.b.level)) || (r.b.experience === "want" && positive(r.a.level))) curious = true;
  }

  // Roles where both want the same side still deserve a conversation.
  for (const r of roles) if (positive(r.a.level) && positive(r.b.level) && !SHARED_ROLE.test(r.label ?? "")) talk = true;

  const bucket = conflict ? "conflict" : match ? "match" : curious ? "curious" : talk ? "talk" : null;
  return { bucket, rolePairs };
}

/** Compares two people's answers for the same list. Items with nothing worth showing are skipped. */
export function compareAnswers(list: KinkList, a: ListData, b: ListData): CompareItem[] {
  const result: CompareItem[] = [];
  for (const category of list.categories) {
    for (const item of category.items) {
      const rows: CompareRow[] =
        item.options.length === 0
          ? [{ key: itemKey(item), label: null, kind: "single", a: {}, b: {} }]
          : item.options.map((o) => ({ key: optionKey(item, o.id), label: o.label, kind: o.kind, a: {}, b: {} }));
      for (const row of rows) {
        row.a = { level: a.answers[row.key], experience: a.experience[row.key] };
        row.b = { level: b.answers[row.key], experience: b.experience[row.key] };
      }
      const { bucket, rolePairs } = classify(rows);
      if (!bucket) continue;
      result.push({
        item,
        category: category.name,
        bucket,
        rolePairs,
        rows: rows.filter((r) => r.a.level || r.b.level || r.a.experience || r.b.experience),
      });
    }
  }
  return result;
}
