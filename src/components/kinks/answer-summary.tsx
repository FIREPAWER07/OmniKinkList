"use client";

import { CheckCircleIcon, SparkleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { allChoices, computeStats, itemKey, optionKey, withCustom } from "@/lib/kinks/choices";
import { LEVELS, type Experience, type KinkList, type Level, type ListData } from "@/lib/kinks/types";
import { CategoryIcon } from "./category-icon";
import { LEVEL_STYLES, LevelChip, LevelGlyph } from "./level";

export function ExperienceChip({ value }: { value: Experience }) {
  const t = useT();
  const Icon = value === "tried" ? CheckCircleIcon : SparkleIcon;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border px-1.5 py-px text-[11px] text-muted">
      <Icon size={11} weight="fill" className="text-accent" aria-hidden />
      {t(`experience.${value}`)}
    </span>
  );
}

/** Read-only overview of one person's answers: distribution, filters, and per-category breakdown. */
export function AnswerSummary({ list, data }: { list: KinkList; data: ListData }) {
  const t = useT();
  const [shown, setShown] = useState<Set<Level>>(() => new Set(LEVELS));
  const [onlyWant, setOnlyWant] = useState(false);
  const categories = useMemo(() => withCustom(list, data.custom, t("custom.category")), [list, data.custom, t]);
  const stats = useMemo(() => computeStats(allChoices(categories), data.answers), [categories, data.answers]);
  const wantCount = Object.values(data.experience).filter((v) => v === "want").length;

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
      categories
        .map((category) => ({
          category,
          items: category.items
            .map((item) => {
              const rows = (
                item.options.length === 0
                  ? [{ key: itemKey(item), label: null as string | null }]
                  : item.options.map((o) => ({ key: optionKey(item, o.id), label: o.label as string | null }))
              )
                .map((row) => ({ ...row, level: data.answers[row.key], experience: data.experience[row.key] }))
                .filter((row) => (onlyWant ? row.experience === "want" : row.level && shown.has(row.level)));
              return { item, rows, note: data.notes[itemKey(item)] };
            })
            .filter(({ rows }) => rows.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [categories, data, shown, onlyWant],
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
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {LEVELS.map((level) => {
            const active = shown.has(level) && !onlyWant;
            const share = stats.answered ? Math.round((stats.byLevel[level] / stats.answered) * 100) : 0;
            return (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setOnlyWant(false);
                  toggle(level);
                }}
                aria-pressed={active}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  active ? "border-border bg-surface-2" : "border-transparent opacity-45 hover:opacity-80",
                )}
              >
                <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", level === "limit" ? "text-fg" : LEVEL_STYLES[level].text)}>
                  <LevelGlyph level={level} size={14} filled /> {t(`levels.${level}`)}
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium tabular-nums">{stats.byLevel[level]}</span>
                  <span className="font-mono text-xs text-subtle tabular-nums">{share}%</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-subtle">{t("results.filterHint")}</p>
          {wantCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyWant((v) => !v)}
              aria-pressed={onlyWant}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                onlyWant ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-fg",
              )}
            >
              <SparkleIcon size={12} weight="fill" aria-hidden /> {t("results.onlyWant", { count: wantCount })}
            </button>
          )}
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted">{t("results.nothingForFilter")}</p>
      ) : (
        <div className="mt-12 grid gap-12">
          {sections.map(({ category, items }) => (
            <section key={category.id}>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight">
                <CategoryIcon name={category.icon} size={18} className="text-accent" />
                {category.name}
              </h2>
              <div className="gap-3 md:columns-2 xl:columns-3">
                {items.map(({ item, rows, note }) => (
                  <article key={`${item.custom ? "c" : "i"}${item.id}`} className="mb-3 break-inside-avoid rounded-xl border border-border bg-surface p-4">
                    <h3 className="font-medium leading-snug">{item.name}</h3>
                    <ul className="mt-2.5 grid gap-1.5">
                      {rows.map((row) => (
                        <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-muted">
                            {row.label ?? t("results.overall")}
                            {row.experience && <ExperienceChip value={row.experience} />}
                          </span>
                          {row.level && <LevelChip level={row.level} />}
                        </li>
                      ))}
                    </ul>
                    {note && <p className="mt-3 whitespace-pre-wrap border-l-2 border-accent pl-3 text-sm text-muted">{note}</p>}
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
