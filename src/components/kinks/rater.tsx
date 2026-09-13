"use client";

import { memo, useRef, type KeyboardEvent } from "react";
import { LEVEL_LABELS, LEVELS, type Level } from "@/lib/kinks/types";
import { LevelGlyph } from "./level";

/**
 * Five-level radio group with a roving tab stop: Tab enters the group once,
 * arrow keys move between levels, Space/Enter picks, picking the active level clears it.
 */
export const Rater = memo(function Rater({
  label,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  value: Level | undefined;
  onChange: (level: Level | null) => void;
  size?: "sm" | "md";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = value ? LEVELS.indexOf(value) : -1;
  const tabIndexFor = (i: number) => (activeIndex === -1 ? (i === 0 ? 0 : -1) : i === activeIndex ? 0 : -1);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + LEVELS.length) % LEVELS.length;
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 gap-1">
      {LEVELS.map((level, index) => {
        const active = value === level;
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={LEVEL_LABELS[level]}
            title={LEVEL_LABELS[level]}
            tabIndex={tabIndexFor(index)}
            onClick={() => onChange(active ? null : level)}
            onKeyDown={(event) => onKeyDown(event, index)}
            data-level={level}
            data-size={size}
            className="rater-btn"
          >
            <LevelGlyph level={level} size={size === "sm" ? 14 : 16} filled={active} />
          </button>
        );
      })}
    </div>
  );
});
