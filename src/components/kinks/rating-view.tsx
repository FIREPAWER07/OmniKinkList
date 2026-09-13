"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { answersStore, useAnswers } from "@/lib/kinks/answers-store";
import { categoryChoices, computeStats, itemChoices, listChoices } from "@/lib/kinks/choices";
import type { KinkList } from "@/lib/kinks/types";
import { cn } from "@/lib/cn";
import { ItemCard, itemAnswerSignature } from "./item-card";
import { LevelLegend } from "./level";

export function RatingView({ list }: { list: KinkList }) {
  const { answers, setAnswer } = useAnswers(list.slug);
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeCategory, setActiveCategory] = useState(list.categories[0]?.id);
  const chipBar = useRef<HTMLDivElement>(null);

  const choices = useMemo(() => listChoices(list), [list]);
  const stats = computeStats(choices, answers);
  const categoryProgress = useMemo(
    () =>
      new Map(
        list.categories.map((category) => {
          const keys = categoryChoices(category).map((c) => c.key);
          return [category.id, { total: keys.length, answered: keys.filter((k) => answers[k]).length }];
        }),
      ),
    [list, answers],
  );

  // Track which category is on screen for the navigation highlight.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveCategory(Number(visible.target.getAttribute("data-category")));
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    document.querySelectorAll("[data-category]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [list]);

  // Keep the active chip visible in the horizontal mobile bar.
  useEffect(() => {
    const bar = chipBar.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${activeCategory}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [activeCategory]);

  const jumpToNextUnanswered = () => {
    for (const category of list.categories) {
      for (const item of category.items) {
        if (itemChoices(item).some((c) => !answers[c.key])) {
          const el = document.getElementById(`item-${item.id}`);
          el?.scrollIntoView({ block: "center" });
          el?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus({ preventScroll: true });
          return;
        }
      }
    }
  };

  return (
    <div className="pb-32">
      <div
        ref={chipBar}
        className="sticky top-14 z-30 flex gap-2 overflow-x-auto border-b border-border bg-bg/90 px-4 py-2 backdrop-blur-md [scrollbar-width:none] lg:hidden"
      >
        {list.categories.map((category) => {
          const progress = categoryProgress.get(category.id)!;
          return (
            <a
              key={category.id}
              href={`#category-${category.id}`}
              data-chip={category.id}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                activeCategory === category.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-fg",
              )}
            >
              {category.name}
              <span className="ml-1.5 font-mono text-xs opacity-70">
                {progress.answered}/{progress.total}
              </span>
            </a>
          );
        })}
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 lg:grid-cols-[220px_1fr] lg:px-8 lg:pt-10">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 grid gap-0.5" aria-label="Categories">
            <p className="mb-2 px-3 text-xs font-medium text-subtle">Categories</p>
            {list.categories.map((category) => {
              const progress = categoryProgress.get(category.id)!;
              const done = progress.total > 0 && progress.answered === progress.total;
              return (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  aria-current={activeCategory === category.id ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    activeCategory === category.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  {done ? (
                    <CheckIcon size={14} weight="bold" className="text-accent" aria-label="Complete" />
                  ) : (
                    <span className="font-mono text-xs text-subtle tabular-nums">
                      {progress.answered}/{progress.total}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <Link href="/#lists" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeftIcon size={14} /> All lists
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{list.name} list</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted">{list.description}</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
            <LevelLegend />
            <p className="text-xs text-subtle">Click an answer again to clear it.</p>
          </div>

          <div className="mt-12 grid gap-14">
            {list.categories.map((category) => {
              const progress = categoryProgress.get(category.id)!;
              return (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  data-category={category.id}
                  className="scroll-mt-32 lg:scroll-mt-20"
                >
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight">{category.name}</h2>
                      {category.description && <p className="mt-1 text-sm text-muted">{category.description}</p>}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-subtle tabular-nums">
                      {progress.answered}/{progress.total}
                    </span>
                  </div>
                  <div className="gap-3 md:columns-2">
                    {category.items.map((item) => (
                      <div key={item.id} id={`item-${item.id}`} className="mb-3 break-inside-avoid scroll-mt-40">
                        <ItemCard item={item} signature={itemAnswerSignature(item, answers)} onRate={setAnswer} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-mono font-medium tabular-nums">{stats.percent}%</span>
              <span className="truncate text-muted">
                {stats.answered} of {stats.total} answered
              </span>
            </div>
            <div className="mt-1.5 h-1 max-w-md overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${stats.percent}%` }} />
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setConfirmReset(true)} disabled={stats.answered === 0}>
            Reset
          </Button>
          <Button variant="secondary" size="sm" className="hidden md:inline-flex" onClick={jumpToNextUnanswered} disabled={stats.answered === stats.total}>
            Next unanswered
          </Button>
          <Link href={`/list/${list.slug}/results`} className={buttonClass("primary", "md")}>
            Results <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all answers?"
        description={`This clears all ${stats.answered} answers for the ${list.name} list in this browser. It cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              answersStore.clear(list.slug);
              setConfirmReset(false);
            }}
          >
            Reset answers
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
