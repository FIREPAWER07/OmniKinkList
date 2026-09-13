import type { Locale } from "./config";
import type { en } from "./messages/en";

type Plural = { one: string; other: string };
type Leaf = string | Plural;

/** Same shape as the English messages, with every leaf widened to a plain string. */
export type Messages = DeepWiden<typeof en>;
type DeepWiden<T> = T extends string ? string : T extends Plural ? Plural : { [K in keyof T]: DeepWiden<T[K]> };

type Paths<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type MessageKey = Paths<Messages>;
export type TranslateParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

function lookup(messages: Messages, key: string): Leaf | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node as Leaf | undefined;
}

/**
 * `t("rating.progress", { answered: 3, total: 40 })`. Leaves that are `{ one, other }`
 * pick a form with the `count` param.
 */
export function createTranslator(locale: Locale, messages: Messages, fallback?: Messages): Translate {
  const plurals = new Intl.PluralRules(locale);
  const numbers = new Intl.NumberFormat(locale);
  return (key, params) => {
    let leaf = lookup(messages, key) ?? (fallback ? lookup(fallback, key) : undefined);
    if (leaf === undefined) return key;
    if (typeof leaf === "object") {
      const count = Number(params?.count ?? 0);
      leaf = plurals.select(count) === "one" ? leaf.one : leaf.other;
    }
    if (!params) return leaf;
    return leaf.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      if (value === undefined) return match;
      return typeof value === "number" ? numbers.format(value) : value;
    });
  };
}
