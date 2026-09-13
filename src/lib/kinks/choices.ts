import {
  LEVELS,
  type Answers,
  type CustomItem,
  type KinkCategory,
  type KinkItem,
  type KinkList,
  type Level,
} from "./types";

/**
 * Every rateable thing is a "choice":
 *  - an item without options: `i12` (or `c3` for a written-in item)
 *  - one option of an item:   `o34` (or `c3.2` for an option of a written-in item)
 * Database ids never change, so keys stay valid across edits.
 */
export type ChoiceKey = string;

export interface Choice {
  key: ChoiceKey;
  item: KinkItem;
  optionId: number | null;
  optionLabel: string | null;
}

const CHOICE_KEY = /^(?:[io]\d+|c\d+(?:\.\d+)?)$/;
const ITEM_KEY = /^[ic]\d+$/;

export function isChoiceKey(value: string): boolean {
  return CHOICE_KEY.test(value);
}

export function isItemKey(value: string): boolean {
  return ITEM_KEY.test(value);
}

/** Key used for notes on an item. */
export function itemKey(item: Pick<KinkItem, "id" | "custom">) {
  return `${item.custom ? "c" : "i"}${item.id}`;
}

export function optionKey(item: Pick<KinkItem, "id" | "custom">, optionId: number) {
  return item.custom ? `c${item.id}.${optionId}` : `o${optionId}`;
}

export function itemChoices(item: KinkItem): Choice[] {
  if (item.options.length === 0) {
    return [{ key: itemKey(item), item, optionId: null, optionLabel: null }];
  }
  return item.options.map((option) => ({
    key: optionKey(item, option.id),
    item,
    optionId: option.id,
    optionLabel: option.label,
  }));
}

export const CUSTOM_CATEGORY_ID = -1;

export function customCategory(custom: CustomItem[], name: string): KinkCategory {
  return {
    id: CUSTOM_CATEGORY_ID,
    name,
    description: "",
    icon: "user",
    items: custom.map((c) => ({ id: c.id, name: c.name, description: c.description, options: c.options, custom: true })),
  };
}

/** The list's categories, plus the person's own items as a last category when they have any. */
export function withCustom(list: KinkList, custom: CustomItem[], customName: string): KinkCategory[] {
  return custom.length ? [...list.categories, customCategory(custom, customName)] : list.categories;
}

export function categoryChoices(category: KinkCategory): Choice[] {
  return category.items.flatMap(itemChoices);
}

export function allChoices(categories: KinkCategory[]): Choice[] {
  return categories.flatMap(categoryChoices);
}

export function listChoices(list: KinkList): Choice[] {
  return allChoices(list.categories);
}

/** Drops keys whose choice no longer exists. */
export function pruneKeys<T>(categories: KinkCategory[], map: Record<string, T>): Record<string, T> {
  const valid = new Set(allChoices(categories).map((c) => c.key));
  const pruned: Record<string, T> = {};
  for (const [key, value] of Object.entries(map)) if (valid.has(key)) pruned[key] = value;
  return pruned;
}

export function pruneAnswers(list: KinkList, answers: Answers): Answers {
  return pruneKeys(list.categories, answers);
}

export interface AnswerStats {
  total: number;
  answered: number;
  percent: number;
  byLevel: Record<Level, number>;
}

export function computeStats(choices: Choice[], answers: Answers): AnswerStats {
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
  let answered = 0;
  for (const choice of choices) {
    const level = answers[choice.key];
    if (level) {
      answered++;
      byLevel[level]++;
    }
  }
  const total = choices.length;
  return { total, answered, percent: total ? Math.floor((answered / total) * 100) : 0, byLevel };
}
