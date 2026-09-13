"use client";

import { CheckCircleIcon, CircleDashedIcon, SparkleIcon } from "@phosphor-icons/react";
import { memo, useRef, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { LEVELS, type Experience, type Level } from "@/lib/kinks/types";
import { LevelGlyph } from "./level";

/**
 * Six-level radio group from Hard limit (left) to Favorite (right), with a roving tab stop:
 * Tab enters the group once, arrow keys move, Space/Enter picks, picking the active level clears it.
 */
export const Rater = memo(function Rater({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Level | undefined;
  onChange: (level: Level | null) => void;
}) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = value ? LEVELS.indexOf(value) : -1;
  const tabIndexFor = (i: number) => (activeIndex === -1 ? (i === LEVELS.length - 1 ? 0 : -1) : i === activeIndex ? 0 : -1);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    refs.current[(index + delta + LEVELS.length) % LEVELS.length]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 gap-1">
      {LEVELS.map((level, index) => {
        const active = value === level;
        const name = t(`levels.${level}`);
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={name}
            title={name}
            tabIndex={tabIndexFor(index)}
            onClick={() => onChange(active ? null : level)}
            onKeyDown={(event) => onKeyDown(event, index)}
            data-level={level}
            className="rater-btn"
          >
            <LevelGlyph level={level} size={15} filled={active} />
          </button>
        );
      })}
    </div>
  );
});

const NEXT_EXPERIENCE: Record<string, Experience | null> = { none: "tried", tried: "want", want: null };

/** Cycles through: not set, tried it, want to try. */
export const ExperienceToggle = memo(function ExperienceToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Experience | undefined;
  onChange: (value: Experience | null) => void;
}) {
  const t = useT();
  const state = value ?? "none";
  const stateLabel = t(`experience.${state}`);
  const Icon = value === "tried" ? CheckCircleIcon : value === "want" ? SparkleIcon : CircleDashedIcon;
  return (
    <button
      type="button"
      onClick={() => onChange(NEXT_EXPERIENCE[state])}
      title={`${stateLabel}. ${t("experience.cycleHint")}`}
      aria-label={t("experience.label", { item: label, state: stateLabel })}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-surface-2",
        value ? "text-accent" : "text-subtle/70 hover:text-muted",
      )}
    >
      <Icon size={16} weight={value ? "fill" : "regular"} aria-hidden />
    </button>
  );
});
