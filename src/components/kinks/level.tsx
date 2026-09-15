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

/**
 * Tailwind classes per level, spelled out so the compiler can see them. `fill` is the level color with its
 * matching foreground. Level colors are fills only: some (yellow) are too light to be used as text.
 */
export const LEVEL_STYLES: Record<Level, { bg: string; fill: string }> = {
  limit: { bg: "bg-limit", fill: "bg-limit text-on-limit" },
  dislike: { bg: "bg-dislike", fill: "bg-dislike text-on-dislike" },
  maybe: { bg: "bg-maybe", fill: "bg-maybe text-on-maybe" },
  indifferent: { bg: "bg-indifferent", fill: "bg-indifferent text-on-indifferent" },
  like: { bg: "bg-like", fill: "bg-like text-on-like" },
  favorite: { bg: "bg-favorite", fill: "bg-favorite text-on-favorite" },
};

/** The level's icon on a square of its color. */
export function LevelSwatch({ level, size = "sm", className }: { level: Level; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "size-5 rounded-md", md: "size-6 rounded-md", lg: "size-11 rounded-lg" }[size];
  const glyph = { sm: 12, md: 14, lg: 22 }[size];
  return (
    <span className={cn("grid shrink-0 place-items-center", box, LEVEL_STYLES[level].fill, className)}>
      <LevelGlyph level={level} size={glyph} filled />
    </span>
  );
}

export function LevelChip({ level, className }: { level: Level; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
        LEVEL_STYLES[level].fill,
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
          <LevelSwatch level={level} />
          {t(`levels.${level}`)}
        </li>
      ))}
    </ul>
  );
}
