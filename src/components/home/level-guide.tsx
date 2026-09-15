"use client";

import { LevelSwatch } from "@/components/kinks/level";
import { useT } from "@/i18n/client";
import { LEVELS } from "@/lib/kinks/types";

/** Levels in the same order as the rater buttons, so the guide teaches the layout people will use. */
export function LevelGuide() {
  const t = useT();
  return (
    <ol className="grid gap-2">
      {LEVELS.map((level) => (
        <li key={level} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <LevelSwatch level={level} size="lg" />
          <div>
            <p className="font-medium">{t(`levels.${level}`)}</p>
            <p className="text-sm text-muted">{t(`levelDescriptions.${level}`)}</p>
          </div>
        </li>
      ))}
      <li className="flex items-center gap-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        {t("home.experienceHint")}
      </li>
    </ol>
  );
}
