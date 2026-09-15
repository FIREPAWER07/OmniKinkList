import "server-only";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { isLocale, type Locale } from "./config";
import { translatorFor } from "./messages";

/** Current locale from the `[locale]` root segment. 404s on anything unsupported. */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  if (!isLocale(value)) notFound();
  return value;
}

export function getTranslator(locale: Locale) {
  return translatorFor(locale);
}

export async function getT() {
  return getTranslator(await getLocale());
}
