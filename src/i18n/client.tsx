"use client";

import { createContext, use, useCallback, useMemo, type ReactNode } from "react";
import { localePath, type Locale } from "./config";
import { translatorFor } from "./messages";
import type { Translate } from "./translator";

const I18nContext = createContext<{ locale: Locale; t: Translate } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: translatorFor(locale) }), [locale]);
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
  return useCallback((path: string) => localePath(locale, path), [locale]);
}
