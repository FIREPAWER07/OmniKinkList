import { DEFAULT_LOCALE, type Locale } from "../config";
import { createTranslator, type Messages, type Translate } from "../translator";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";

export const MESSAGES: Record<Locale, Messages> = { en, it, es, de, fr };

const translators = new Map<Locale, Translate>();

/** The translator for a locale, falling back to English. Created once per locale, since it is pure. */
export function translatorFor(locale: Locale): Translate {
  let t = translators.get(locale);
  if (!t) {
    t = createTranslator(locale, MESSAGES[locale], MESSAGES[DEFAULT_LOCALE]);
    translators.set(locale, t);
  }
  return t;
}
