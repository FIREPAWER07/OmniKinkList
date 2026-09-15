"use client";

import { CheckIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon, TranslateIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";
import { Menu, MenuButton, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, localePath, stripLocale, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { ACCENT_KEY, ACCENTS, type Accent } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/kinks/store";

const SWATCH: Record<Accent, string> = { pink: "#ff4f8b", violet: "#a78bfa", blue: "#6ea4ff", teal: "#3ed3bf", orange: "#ff9a52" };

const accentListeners = new Set<() => void>();

function subscribeAccent(listener: () => void) {
  accentListeners.add(listener);
  return () => accentListeners.delete(listener);
}

function readAccent(): Accent {
  try {
    const value = localStorage.getItem(ACCENT_KEY);
    return (ACCENTS as readonly string[]).includes(value ?? "") ? (value as Accent) : "pink";
  } catch {
    return "pink";
  }
}

function setAccent(accent: Accent) {
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // Not persisted, still applied for this page.
  }
  applyAccent(accent);
  accentListeners.forEach((listener) => listener());
}

function applyAccent(accent: Accent) {
  if (accent === "pink") document.documentElement.removeAttribute("data-accent");
  else document.documentElement.setAttribute("data-accent", accent);
}

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function PreferencesMenu() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const hydrated = useHydrated();
  const { theme, setTheme } = useTheme();
  const accent = useSyncExternalStore(subscribeAccent, readAccent, () => "pink" as Accent);

  // The inline script handles first paint; this re-applies it when a language switch re-renders <html>.
  useEffect(() => {
    applyAccent(readAccent());
  }, []);

  const switchLocale = (next: Locale) => {
    rememberLocale(next);
    // Read on click, not during render: the header is part of every page's static shell.
    const { path } = stripLocale(window.location.pathname);
    router.push(localePath(next, path) + window.location.search + window.location.hash);
  };

  const themes = [
    { value: "light", label: t("preferences.light"), Icon: SunIcon },
    { value: "dark", label: t("preferences.dark"), Icon: MoonIcon },
    { value: "system", label: t("preferences.system"), Icon: MonitorIcon },
  ];

  return (
    <Menu
      label={t("preferences.menu")}
      trigger={
        <MenuButton className="size-9" aria-label={t("preferences.menu")} data-tooltip={t("preferences.menu")}>
          <PaletteIcon size={18} aria-hidden />
        </MenuButton>
      }
    >
      <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs text-subtle">
        <TranslateIcon size={13} aria-hidden /> {t("preferences.language")}
      </p>
      {LOCALES.map((l) => (
        <MenuItem key={l} onSelect={() => switchLocale(l)}>
          <CheckIcon size={14} weight="bold" className={l === locale ? "text-accent" : "invisible"} aria-hidden />
          <span lang={l}>{LOCALE_NAMES[l]}</span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <p className="px-3 pb-1 pt-2 text-xs text-subtle">{t("preferences.theme")}</p>
      <div className="grid grid-cols-3 gap-1 px-1 pb-1">
        {themes.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={hydrated && theme === value}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs",
              hydrated && theme === value ? "border-accent text-fg" : "border-transparent text-muted hover:bg-surface-2",
            )}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <p className="px-3 pb-1 pt-2 text-xs text-subtle">{t("preferences.accent")}</p>
      <div className="flex gap-2 px-3 pb-3 pt-1">
        {ACCENTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setAccent(value)}
            aria-label={t(`preferences.accents.${value}`)}
            aria-pressed={accent === value}
            data-tooltip={t(`preferences.accents.${value}`)}
            className={cn(
              "size-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
              accent === value ? "ring-2 ring-fg" : "hover:ring-2 hover:ring-border-strong",
            )}
            style={{ background: SWATCH[value] }}
          />
        ))}
      </div>
    </Menu>
  );
}
