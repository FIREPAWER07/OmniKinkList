"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, localePath, type Locale } from "./config";
import { MESSAGES } from "./messages";
import { createTranslator, type Translate } from "./translator";

const I18nContext = createContext<{ locale: Locale; t: Translate } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(locale, MESSAGES[locale], MESSAGES[DEFAULT_LOCALE]) }),
    [locale],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  return useI18n().locale;
}

/** Builds hrefs for the current locale: `href("/import")` is `/it/import` in Italian. */
export function useHref() {
  const locale = useLocale();
  return (path: string) => localePath(locale, path);
}
