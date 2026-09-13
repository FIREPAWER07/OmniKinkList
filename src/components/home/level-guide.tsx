"use client";

import { LEVEL_STYLES, LevelGlyph } from "@/components/kinks/level";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { LEVELS } from "@/lib/kinks/types";

export function LevelGuide() {
  const t = useT();
  return (
    <ol className="grid gap-2">
      {[...LEVELS].reverse().map((level) => (
        <li key={level} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg text-on-level", LEVEL_STYLES[level].bg)}>
            <LevelGlyph level={level} size={22} filled />
          </span>
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
