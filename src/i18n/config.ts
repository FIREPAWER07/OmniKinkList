export const LOCALES = ["en", "it", "es", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Languages content can be translated into (English is the source). */
export const TRANSLATION_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE) as Exclude<Locale, "en">[];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

export const LOCALE_COOKIE = "okl-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** English lives at the root (`/import`), other languages under a prefix (`/it/import`). */
export function localePath(locale: Locale, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Removes a locale prefix from a pathname. */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, path: `/${rest.join("/")}` };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}
