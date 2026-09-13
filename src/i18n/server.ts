import "server-only";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { MESSAGES } from "./messages";
import { createTranslator } from "./translator";

/** Current locale from the `[locale]` root segment. 404s on anything unsupported. */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  if (!isLocale(value)) notFound();
  return value;
}

export function getTranslator(locale: Locale) {
  return createTranslator(locale, MESSAGES[locale], MESSAGES[DEFAULT_LOCALE]);
}

export async function getT() {
  return getTranslator(await getLocale());
}
