"use client";

import { LEVEL_DESCRIPTIONS, LEVEL_ICONS, LEVEL_STYLES } from "@/components/kinks/level";
import { cn } from "@/lib/cn";
import { LEVEL_LABELS, LEVELS } from "@/lib/kinks/types";

export function LevelGuide() {
  return (
    <ol className="grid gap-2">
      {LEVELS.map((level) => {
        const Icon = LEVEL_ICONS[level];
        return (
          <li key={level} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg text-on-level", LEVEL_STYLES[level].bg)}>
              <Icon size={22} weight="fill" aria-hidden />
            </span>
            <div>
              <p className="font-medium">{LEVEL_LABELS[level]}</p>
              <p className="text-sm text-muted">{LEVEL_DESCRIPTIONS[level]}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
