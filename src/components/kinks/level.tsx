"use client";

import {
  HeartIcon,
  MinusIcon,
  ProhibitIcon,
  QuestionIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { LEVELS, type Level } from "@/lib/kinks/types";

export const LEVEL_ICONS: Record<Level, Icon> = {
  limit: ProhibitIcon,
  dislike: ThumbsDownIcon,
  maybe: QuestionIcon,
  indifferent: MinusIcon,
  like: ThumbsUpIcon,
  favorite: HeartIcon,
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
  limit: { text: "text-limit", bg: "bg-limit" },
  dislike: { text: "text-dislike", bg: "bg-dislike" },
  maybe: { text: "text-maybe", bg: "bg-maybe" },
  indifferent: { text: "text-indifferent", bg: "bg-indifferent" },
  like: { text: "text-like", bg: "bg-like" },
  favorite: { text: "text-favorite", bg: "bg-favorite" },
};

export function LevelChip({ level, className }: { level: Level; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-on-level",
        LEVEL_STYLES[level].bg,
        className,
      )}
    >
      <LevelGlyph level={level} size={12} filled />
      {t(`levels.${level}`)}
    </span>
  );
}

export function LevelLegend({ className }: { className?: string }) {
  const t = useT();
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted", className)}>
      {LEVELS.map((level) => (
        <li key={level} className="inline-flex items-center gap-1.5">
          <span className={cn("grid size-5 place-items-center rounded-md text-on-level", LEVEL_STYLES[level].bg)}>
            <LevelGlyph level={level} size={12} filled />
          </span>
          {t(`levels.${level}`)}
        </li>
      ))}
    </ul>
  );
}
