import { isChoiceKey, isItemKey } from "./choices";
import { isExperience, isLevel, OPTION_KINDS, type CustomItem, type ListData, type OptionKind } from "./types";

export const NOTE_MAX = 1000;
export const CUSTOM_MAX = 50;

export function emptyListData(): ListData {
  return { answers: {}, experience: {}, notes: {}, custom: [], updatedAt: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function sanitizeCustom(raw: unknown): CustomItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const result: CustomItem[] = [];
  for (const entry of raw.slice(0, CUSTOM_MAX)) {
    if (!isRecord(entry)) continue;
    const id = Number(entry.id);
    const name = cleanText(entry.name, 80).trim();
    if (!Number.isInteger(id) || id <= 0 || seen.has(id) || !name) continue;
    seen.add(id);
    const optionIds = new Set<number>();
    const options = (Array.isArray(entry.options) ? entry.options : [])
      .slice(0, 24)
      .filter(isRecord)
      .map((o) => ({
        id: Number(o.id),
        label: cleanText(o.label, 50).trim(),
        kind: (OPTION_KINDS as readonly string[]).includes(o.kind as string) ? (o.kind as OptionKind) : "variant",
      }))
      .filter((o) => Number.isInteger(o.id) && o.id > 0 && o.label && !optionIds.has(o.id) && optionIds.add(o.id));
    result.push({ id, name, description: cleanText(entry.description, 300), options });
  }
  return result;
}

/** Accepts anything (localStorage, imports, decrypted sync data) and returns valid list data. */
export function sanitizeListData(raw: unknown): ListData {
  const data = emptyListData();
  if (!isRecord(raw)) return data;
  if (isRecord(raw.answers)) {
    for (const [key, level] of Object.entries(raw.answers)) if (isChoiceKey(key) && isLevel(level)) data.answers[key] = level;
  }
  if (isRecord(raw.experience)) {
    for (const [key, value] of Object.entries(raw.experience)) if (isChoiceKey(key) && isExperience(value)) data.experience[key] = value;
  }
  if (isRecord(raw.notes)) {
    for (const [key, value] of Object.entries(raw.notes)) {
      const note = cleanText(value, NOTE_MAX);
      if (isItemKey(key) && note.trim()) data.notes[key] = note;
    }
  }
  data.custom = sanitizeCustom(raw.custom);
  if (typeof raw.lastVisitAt === "number") data.lastVisitAt = raw.lastVisitAt;
  if (typeof raw.updatedAt === "number") data.updatedAt = raw.updatedAt;
  return data;
}

export function isEmptyListData(data: ListData) {
  return (
    Object.keys(data.answers).length === 0 &&
    Object.keys(data.experience).length === 0 &&
    Object.keys(data.notes).length === 0 &&
    data.custom.length === 0
  );
}

export function setKey<T>(map: Record<string, T>, key: string, value: T | null | undefined): Record<string, T> {
  const next = { ...map };
  if (value === null || value === undefined || value === "") delete next[key];
  else next[key] = value;
  return next;
}

export function nextCustomId(custom: CustomItem[]) {
  return Math.max(0, ...custom.map((c) => c.id)) + 1;
}

