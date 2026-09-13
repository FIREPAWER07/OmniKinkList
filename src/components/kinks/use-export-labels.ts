"use client";

import { useLocale, useT } from "@/i18n/client";
import type { ExportLabels } from "@/lib/kinks/export-html";
import { EXPERIENCES, LEVELS, type Experience, type Level } from "@/lib/kinks/types";

export function useExportLabels(listName: string): ExportLabels {
  const t = useT();
  const locale = useLocale();
  return {
    lang: locale,
    title: t("exportFile.title", { name: listName }),
    heading: t("exportFile.heading"),
    summary: t("exportFile.summary", { answered: "{answered}", total: "{total}" }),
    exported: t("exportFile.exported", { date: "{date}" }),
    toggleTheme: t("exportFile.toggleTheme"),
    footer: t("exportFile.footer"),
    yourItems: t("custom.category"),
    note: t("notes.title"),
    levels: Object.fromEntries(LEVELS.map((l) => [l, t(`levels.${l}`)])) as Record<Level, string>,
    experience: Object.fromEntries(EXPERIENCES.map((e) => [e, t(`experience.${e}`)])) as Record<Experience, string>,
  };
}
