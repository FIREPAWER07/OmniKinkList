import { LEVELS, type Answers, type KinkCategory, type KinkItem, type KinkList, type Level } from "./types";

/**
 * Every rateable thing is a "choice". Items without options are a single choice
 * keyed by item id (`i12`); items with options get one choice per option (`o34`).
 * Ids come from the database and stay stable across edits.
 */
export type ChoiceKey = `i${number}` | `o${number}`;

export interface Choice {
  key: ChoiceKey;
  item: KinkItem;
  optionLabel: string | null;
}

export function itemChoices(item: KinkItem): Choice[] {
  if (item.options.length === 0) {
    return [{ key: `i${item.id}`, item, optionLabel: null }];
  }
  return item.options.map((option) => ({ key: `o${option.id}`, item, optionLabel: option.label }));
}

export function categoryChoices(category: KinkCategory): Choice[] {
  return category.items.flatMap(itemChoices);
}

export function listChoices(list: KinkList): Choice[] {
  return list.categories.flatMap(categoryChoices);
}

export function isChoiceKey(value: string): value is ChoiceKey {
  return /^[io]\d+$/.test(value);
}

/** Drops answers whose choice no longer exists in the list. */
export function pruneAnswers(list: KinkList, answers: Answers): Answers {
  const valid = new Set<string>(listChoices(list).map((c) => c.key));
  const pruned: Answers = {};
  for (const [key, level] of Object.entries(answers)) {
    if (valid.has(key)) pruned[key] = level;
  }
  return pruned;
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
  return { total, answered, percent: total ? Math.round((answered / total) * 100) : 0, byLevel };
}
