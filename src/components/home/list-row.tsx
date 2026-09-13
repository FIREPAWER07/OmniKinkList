"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useAnswers } from "@/lib/kinks/answers-store";
import { cn } from "@/lib/cn";
import type { KinkListSummary } from "@/lib/kinks/types";

export function ListRow({ summary, featured }: { summary: KinkListSummary; featured?: boolean }) {
  const { answers } = useAnswers(summary.slug);
  const answered = Object.keys(answers).length;
  const percent = summary.choiceCount ? Math.min(100, Math.round((answered / summary.choiceCount) * 100)) : 0;

  return (
    <Link
      href={`/list/${summary.slug}`}
      className={cn(
        "group grid items-center gap-4 rounded-xl border bg-surface p-5 transition-colors md:grid-cols-[1fr_auto_auto] md:gap-8 md:p-6",
        featured ? "border-accent/40 hover:border-accent" : "border-border hover:border-border-strong",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold tracking-tight">{summary.name}</h3>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">{summary.tagline}</span>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{summary.description}</p>
      </div>
      <dl className="flex gap-6 text-sm">
        <div>
          <dt className="text-subtle">Categories</dt>
          <dd className="font-mono text-base tabular-nums">{summary.categoryCount}</dd>
        </div>
        <div>
          <dt className="text-subtle">Answers</dt>
          <dd className="font-mono text-base tabular-nums">{summary.choiceCount}</dd>
        </div>
        {answered > 0 && (
          <div>
            <dt className="text-subtle">Done</dt>
            <dd className="font-mono text-base tabular-nums text-accent">{percent}%</dd>
          </div>
        )}
      </dl>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-fg">
        {answered > 0 ? "Continue" : "Start"}
        <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
