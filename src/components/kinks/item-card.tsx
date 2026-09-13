"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";
import type { Answers, KinkItem, Level } from "@/lib/kinks/types";
import { Rater } from "./rater";

export type RateHandler = (key: string, level: Level | null) => void;

/** Signature of an item's answers, so memoized cards only re-render when their own answers change. */
export function itemAnswerSignature(item: KinkItem, answers: Answers) {
  if (item.options.length === 0) return answers[`i${item.id}`] ?? "";
  return item.options.map((o) => answers[`o${o.id}`] ?? "").join(",");
}

export const ItemCard = memo(function ItemCard({
  item,
  signature,
  onRate,
  className,
}: {
  item: KinkItem;
  /** See `itemAnswerSignature`. */
  signature: string;
  onRate: RateHandler;
  className?: string;
}) {
  const values = signature.split(",") as (Level | "")[];

  if (item.options.length === 0) {
    const value = values[0] || undefined;
    return (
      <article
        className={cn(
          "flex flex-wrap items-start justify-between gap-x-4 gap-y-3 rounded-xl border border-border bg-surface p-4",
          className,
        )}
      >
        <div className="min-w-0 flex-1 basis-48">
          <h3 className="font-medium leading-snug">{item.name}</h3>
          {item.description && <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>}
        </div>
        <Rater label={item.name} value={value} onChange={(level) => onRate(`i${item.id}`, level)} />
      </article>
    );
  }

  const answered = values.filter(Boolean).length;
  return (
    <article className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium leading-snug">{item.name}</h3>
        <span className="shrink-0 font-mono text-xs text-subtle tabular-nums">
          {answered}/{item.options.length}
        </span>
      </div>
      {item.description && <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>}
      <ul className="mt-3 grid gap-1">
        {item.options.map((option, index) => (
          <li
            key={option.id}
            className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-surface-2"
          >
            <span className="min-w-0 text-sm leading-snug">{option.label}</span>
            <Rater
              label={`${item.name}: ${option.label}`}
              value={values[index] || undefined}
              onChange={(level) => onRate(`o${option.id}`, level)}
            />
          </li>
        ))}
      </ul>
    </article>
  );
});
