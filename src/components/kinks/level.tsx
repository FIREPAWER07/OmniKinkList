"use client";

import { HeartIcon, MinusIcon, QuestionIcon, ThumbsDownIcon, ThumbsUpIcon, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { LEVEL_LABELS, LEVELS, type Level } from "@/lib/kinks/types";

export const LEVEL_ICONS: Record<Level, Icon> = {
  favorite: HeartIcon,
  like: ThumbsUpIcon,
  indifferent: MinusIcon,
  maybe: QuestionIcon,
  dislike: ThumbsDownIcon,
};

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  favorite: "A big yes. You love this.",
  like: "You enjoy it or would happily try it.",
  indifferent: "Fine either way, no strong feelings.",
  maybe: "Curious, but only in the right situation.",
  dislike: "Not for you. A hard or soft limit.",
};

/**
 * All level icons rendered once as SVG symbols. Raters reference them with <use>,
 * which keeps pages with thousands of buttons small.
 */
export function LevelIconSprite() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      {LEVELS.flatMap((level) => {
        const Icon = LEVEL_ICONS[level];
        return (["regular", "fill"] as const).map((weight) => (
          <symbol key={`${level}-${weight}`} id={`lv-${level}-${weight}`} viewBox="0 0 256 256">
            <Icon size={256} weight={weight} />
          </symbol>
        ));
      })}
    </svg>
  );
}

export function LevelGlyph({ level, size, filled }: { level: Level; size: number; filled?: boolean }) {
  return (
    <svg aria-hidden width={size} height={size} fill="currentColor">
      <use href={`#lv-${level}-${filled ? "fill" : "regular"}`} />
    </svg>
  );
}

/** Tailwind classes per level, spelled out so the compiler can see them. */
export const LEVEL_STYLES: Record<Level, { text: string; bg: string }> = {
  favorite: { text: "text-favorite", bg: "bg-favorite" },
  like: { text: "text-like", bg: "bg-like" },
  indifferent: { text: "text-indifferent", bg: "bg-indifferent" },
  maybe: { text: "text-maybe", bg: "bg-maybe" },
  dislike: { text: "text-dislike", bg: "bg-dislike" },
};

export function LevelChip({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-on-level",
        LEVEL_STYLES[level].bg,
        className,
      )}
    >
      <LevelGlyph level={level} size={12} filled />
      {LEVEL_LABELS[level]}
    </span>
  );
}

export function LevelLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted", className)}>
      {LEVELS.map((level) => {
        const Icon = LEVEL_ICONS[level];
        return (
          <li key={level} className="inline-flex items-center gap-1.5">
            <span className={cn("grid size-5 place-items-center rounded-md text-on-level", LEVEL_STYLES[level].bg)}>
              <Icon size={12} weight="fill" aria-hidden />
            </span>
            {LEVEL_LABELS[level]}
          </li>
        );
      })}
    </ul>
  );
}
