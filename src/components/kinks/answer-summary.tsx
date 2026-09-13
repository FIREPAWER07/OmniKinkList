"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { computeStats, listChoices } from "@/lib/kinks/choices";
import { LEVEL_LABELS, LEVELS, type Answers, type KinkList, type Level } from "@/lib/kinks/types";
import { LEVEL_ICONS, LEVEL_STYLES, LevelChip } from "./level";

/** Read-only overview of a set of answers: distribution, level filter, and per-category breakdown. */
export function AnswerSummary({ list, answers }: { list: KinkList; answers: Answers }) {
  const [shown, setShown] = useState<Set<Level>>(() => new Set(LEVELS));
  const stats = useMemo(() => computeStats(listChoices(list), answers), [list, answers]);

  const toggle = (level: Level) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(level) && next.size > 1) next.delete(level);
      else if (next.has(level)) return new Set(LEVELS);
      else next.add(level);
      return next;
    });

  const sections = useMemo(
    () =>
      list.categories
        .map((category) => ({
          category,
          items: category.items
            .map((item) => ({
              item,
              rows:
                item.options.length === 0
                  ? [{ key: `i${item.id}`, label: null as string | null, level: answers[`i${item.id}`] }]
                  : item.options.map((o) => ({ key: `o${o.id}`, label: o.label as string | null, level: answers[`o${o.id}`] })),
            }))
            .map(({ item, rows }) => ({ item, rows: rows.filter((r) => r.level && shown.has(r.level)) }))
            .filter(({ rows }) => rows.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [list, answers, shown],
  );

  return (
    <div>
      <div className="rounded-xl border border-border bg-surface p-5 md:p-6">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {stats.answered === 0 ? (
            <div className="flex-1 bg-surface-2" />
          ) : (
            LEVELS.filter((l) => stats.byLevel[l] > 0).map((level) => (
              <div key={level} className={LEVEL_STYLES[level].bg} style={{ flexGrow: stats.byLevel[level] }} />
            ))
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {LEVELS.map((level) => {
            const Icon = LEVEL_ICONS[level];
            const active = shown.has(level);
            const share = stats.answered ? Math.round((stats.byLevel[level] / stats.answered) * 100) : 0;
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggle(level)}
                aria-pressed={active}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  active ? "border-border bg-surface-2" : "border-transparent opacity-45 hover:opacity-80",
                )}
              >
                <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", LEVEL_STYLES[level].text)}>
                  <Icon size={14} weight="fill" aria-hidden /> {LEVEL_LABELS[level]}
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium tabular-nums">{stats.byLevel[level]}</span>
                  <span className="font-mono text-xs text-subtle tabular-nums">{share}%</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-subtle">Click a level to show or hide it below.</p>
      </div>

      {sections.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted">
          Nothing to show for the selected levels.
        </p>
      ) : (
        <div className="mt-12 grid gap-12">
          {sections.map(({ category, items }) => (
            <section key={category.id}>
              <h2 className="mb-4 text-xl font-semibold tracking-tight">{category.name}</h2>
              <div className="gap-3 md:columns-2 xl:columns-3">
                {items.map(({ item, rows }) => (
                  <article key={item.id} className="mb-3 break-inside-avoid rounded-xl border border-border bg-surface p-4">
                    {rows.length === 1 && rows[0].label === null ? (
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium leading-snug">{item.name}</h3>
                        <LevelChip level={rows[0].level!} />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium leading-snug">{item.name}</h3>
                        <ul className="mt-2.5 grid gap-1.5">
                          {rows.map((row) => (
                            <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted">{row.label}</span>
                              <LevelChip level={row.level!} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
