import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { emptyListData, sanitizeListData } from "./list-data";
import type { Answers, Level, ListData } from "./types";

/**
 * Share links carry the answers in the URL hash (`/s#...`), which browsers never send to a server.
 *
 * Payload before compression is a JSON array:
 *   [3, slug, levelGroups[6], triedKeys, wantKeys, notes | 0, customItems | 0, name | 0]
 * Level groups follow ENCODE_ORDER (not the display order) so the format never depends on UI changes.
 */
const FORMAT_VERSION = 3;
const ENCODE_ORDER: Level[] = ["favorite", "like", "indifferent", "maybe", "dislike", "limit"];

export interface SharedList {
  slug: string;
  name: string | null;
  data: ListData;
}

type CompactOption = [number, string, "r" | "v"];
type CompactCustom = [number, string, string, CompactOption[]];

export function encodeShare(slug: string, data: ListData, options: { includeNotes?: boolean; name?: string } = {}) {
  const keysWhere = <T,>(map: Record<string, T>, value: T) =>
    Object.keys(map)
      .filter((key) => map[key] === value)
      .sort()
      .join(",");
  const custom: CompactCustom[] = data.custom.map((c) => [
    c.id,
    c.name,
    c.description,
    c.options.map((o) => [o.id, o.label, o.kind === "role" ? "r" : "v"]),
  ]);
  const payload = [
    FORMAT_VERSION,
    slug,
    ENCODE_ORDER.map((level) => keysWhere<Level>(data.answers, level)),
    keysWhere(data.experience, "tried"),
    keysWhere(data.experience, "want"),
    options.includeNotes && Object.keys(data.notes).length ? data.notes : 0,
    custom.length ? custom : 0,
    options.name?.trim() ? options.name.trim().slice(0, 40) : 0,
  ];
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShare(payload: string): SharedList | null {
  const raw = decompressFromEncodedURIComponent(payload.trim().replace(/^#/, ""));
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed[0] !== FORMAT_VERSION || typeof parsed[1] !== "string") return null;
  const [, slug, groups, tried, want, notes, custom, name] = parsed;
  if (!Array.isArray(groups) || groups.length !== ENCODE_ORDER.length) return null;

  const answers: Answers = {};
  groups.forEach((group: unknown, index) => {
    if (typeof group !== "string" || !group) return;
    for (const key of group.split(",")) answers[key] = ENCODE_ORDER[index];
  });
  const experience: Record<string, string> = {};
  if (typeof tried === "string" && tried) for (const key of tried.split(",")) experience[key] = "tried";
  if (typeof want === "string" && want) for (const key of want.split(",")) experience[key] = "want";

  const customItems = Array.isArray(custom)
    ? (custom as CompactCustom[]).map((c) => ({
        id: c?.[0],
        name: c?.[1],
        description: c?.[2],
        options: Array.isArray(c?.[3]) ? c[3].map((o) => ({ id: o?.[0], label: o?.[1], kind: o?.[2] === "r" ? "role" : "variant" })) : [],
      }))
    : [];

  const data = sanitizeListData({ ...emptyListData(), answers, experience, notes: notes || {}, custom: customItems, updatedAt: Date.now() });
  return { slug, name: typeof name === "string" ? name.slice(0, 40) : null, data };
}

export function shareUrl(origin: string, localePrefix: string, slug: string, data: ListData, options?: { includeNotes?: boolean; name?: string }) {
  return `${origin}${localePrefix}/s#${encodeShare(slug, data, options)}`;
}

/** Accepts a full share URL or just the hash payload. */
export function decodeShareInput(input: string): SharedList | null {
  const trimmed = input.trim();
  const hashIndex = trimmed.indexOf("#");
  return decodeShare(hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed);
}
