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

const wants = (side: CompareSide) => side.experience === "want";

function compatible(a: CompareRow, b: CompareRow) {
  return a.key !== b.key || SHARED_ROLE.test(a.label ?? "");
}

/** How person A's answer relates to person B's, for one pair of choices. */
function relate(a: CompareSide, b: CompareSide) {
  return {
    match: positive(a.level) && positive(b.level),
    conflict: (positive(a.level) && negative(b.level)) || (negative(a.level) && positive(b.level)),
    talk: (positive(a.level) && neutral(b.level)) || (neutral(a.level) && positive(b.level)),
    curious: (wants(a) && (wants(b) || positive(b.level))) || (wants(b) && positive(a.level)),
  };
}

function classify(rows: CompareRow[]): { bucket: CompareBucket | null; rolePairs: [string, string][] } {
  const roles = rows.filter((r) => r.kind === "role");
  const direct = rows.filter((r) => r.kind !== "role");
  const rolePairs: [string, string][] = [];
  const found = { conflict: false, match: false, curious: false, talk: false };
  const record = (relation: ReturnType<typeof relate>) => {
    for (const flag of Object.keys(found) as (keyof typeof found)[]) if (relation[flag]) found[flag] = true;
  };

  // Roles pair up across people: A's "Giving" with B's "Receiving".
  for (const x of roles) {
    for (const y of roles) {
      if (!compatible(x, y)) continue;
      const relation = relate(x.a, y.b);
      if (relation.match) rolePairs.push([x.label ?? "", y.label ?? ""]);
      record(relation);
    }
  }

  for (const r of direct) record(relate(r.a, r.b));

  // Roles where both want the same side still deserve a conversation.
  for (const r of roles) if (positive(r.a.level) && positive(r.b.level) && !SHARED_ROLE.test(r.label ?? "")) found.talk = true;

  const { conflict, match, curious, talk } = found;
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
