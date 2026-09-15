"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHref, useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { allChoices, categoryChoices, computeStats, itemChoices, itemKey, withCustom } from "@/lib/kinks/choices";
import { listStore, useListData, useProfiles } from "@/lib/kinks/store";
import type { KinkItem, KinkList } from "@/lib/kinks/types";
import { CategoryIcon } from "./category-icon";
import { Celebration } from "./celebration";
import { CustomItemDialog } from "./custom-item-dialog";
import { ItemCard } from "./item-card";
import { LevelLegend } from "./level";
import { useProfileName } from "./profile-switcher";

export function RatingView({ list }: { list: KinkList }) {
  const t = useT();
  const href = useHref();
  const { data, setAnswer, setExperience } = useListData(list.slug);
  const profiles = useProfiles();
  const profileName = useProfileName(profiles.profiles.find((p) => p.id === profiles.active));
  const [confirmReset, setConfirmReset] = useState(false);
  const [customDialog, setCustomDialog] = useState<{ item?: KinkItem } | null>(null);
  const [query, setQuery] = useState("");
  /** Item keys that were unanswered when the filter was turned on. */
  const [onlyUnanswered, setOnlyUnanswered] = useState<Set<string> | null>(null);
  const [newSince, setNewSince] = useState<number | undefined>();
  const root = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const chipBar = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => withCustom(list, data.custom, t("custom.category")), [list, data.custom, t]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const stats = useMemo(() => computeStats(allChoices(categories), data.answers), [categories, data.answers]);

  // Remember when this profile last opened the list, to highlight what was published since.
  const visited = useRef<string | null>(null);
  useEffect(() => {
    const visitKey = `${profiles.active}:${list.slug}`;
    if (visited.current === visitKey) return;
    visited.current = visitKey;
    setNewSince(listStore.markVisited(list.slug));
  }, [list.slug, profiles.active]);

  const onNote = useCallback((key: string, note: string) => listStore.setNote(list.slug, key, note), [list.slug]);
  const onEditCustom = useCallback((item: KinkItem) => setCustomDialog({ item }), []);

  const progress = useMemo(
    () =>
      new Map(
        categories.map((category) => {
          const keys = categoryChoices(category).map((c) => c.key);
          return [category.id, { total: keys.length, answered: keys.filter((k) => data.answers[k]).length }];
        }),
      ),
    [categories, data.answers],
  );

  const q = query.trim().toLowerCase();
  const visibleCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => {
            if (onlyUnanswered && !onlyUnanswered.has(itemKey(item))) return false;
            if (!q) return true;
            return (
              item.name.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.options.some((o) => o.label.toLowerCase().includes(q))
            );
          }),
        }))
        .filter((category) => category.items.length > 0),
    [categories, onlyUnanswered, q],
  );
  const visibleIds = useMemo(() => new Set(visibleCategories.map((c) => c.id)), [visibleCategories]);

  const isUnanswered = (item: KinkItem) => itemChoices(item).some((c) => !data.answers[c.key]);

  const toggleUnanswered = () => {
    if (onlyUnanswered) return setOnlyUnanswered(null);
    // Take a snapshot, so items don't vanish the moment they get answered.
    const keys = new Set<string>();
    for (const item of categories.flatMap((c) => c.items)) if (isUnanswered(item)) keys.add(itemKey(item));
    setOnlyUnanswered(keys);
  };

  // Category headers stick right under whichever bar is sticky at this width (toolbar on desktop, chips on
  // phones). Its height goes into a CSS variable, so resizing never re-renders the list.
  useEffect(() => {
    const bars = [toolbar.current, chipBar.current].filter((el): el is HTMLDivElement => !!el);
    const update = () => {
      const height = bars.reduce((sum, el) => sum + (getComputedStyle(el).position === "sticky" ? el.offsetHeight : 0), 0);
      root.current?.style.setProperty("--bars", `${height}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    bars.forEach((el) => observer.observe(el));
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveCategory(Number(visible.target.getAttribute("data-category")));
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    document.querySelectorAll("[data-category]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visibleCategories]);

  useEffect(() => {
    const bar = chipBar.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${activeCategory}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [activeCategory]);

  const jumpToNextUnanswered = () => {
    for (const category of visibleCategories) {
      for (const item of category.items) {
        if (isUnanswered(item)) {
          const el = document.getElementById(`item-${itemKey(item)}`);
          el?.scrollIntoView({ block: "center" });
          el?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus({ preventScroll: true });
          return;
        }
      }
    }
  };

  return (
    <div ref={root} className="pb-32 [--bars:0px]">
      <div className="mx-auto grid max-w-[120rem] gap-8 px-4 pt-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8 lg:pt-8 xl:gap-10">
        <aside className="hidden lg:block">
          <nav
            className="sticky top-20 grid max-h-[calc(100dvh-10rem)] grid-cols-[minmax(0,1fr)] gap-0.5 overflow-y-auto overflow-x-hidden pb-4 [scrollbar-width:thin]"
            aria-label={t("rating.categories")}
          >
            <p className="mb-2 px-3 text-xs font-medium text-subtle">{t("rating.categories")}</p>
            {categories.map((category) => {
              const p = progress.get(category.id)!;
              const done = p.total > 0 && p.answered === p.total;
              const hidden = !visibleIds.has(category.id);
              return (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  aria-current={activeCategory === category.id ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    activeCategory === category.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                    hidden && "pointer-events-none opacity-40",
                  )}
                >
                  <CategoryIcon name={category.icon} size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  {done ? (
                    <CheckIcon size={14} weight="bold" className="text-accent" aria-label={t("rating.complete")} />
                  ) : (
                    <span className="font-mono text-xs text-subtle tabular-nums">
                      {p.answered}/{p.total}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <Link href={href("/#lists")} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeftIcon size={14} /> {t("rating.allLists")}
          </Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("rating.title", { name: list.name })}</h1>
            <p className="text-sm text-subtle">{t("rating.answeringAs", { name: profileName })}</p>
          </div>
          <p className="mt-1.5 max-w-3xl leading-relaxed text-muted">{list.description}</p>

          <div
            ref={toolbar}
            className="z-30 -mx-4 mt-5 grid gap-3 border-b border-border bg-bg/90 px-4 pb-3 pt-1 backdrop-blur-md lg:sticky lg:top-14 lg:mx-0 lg:px-0 lg:pt-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 basis-56">
                <MagnifyingGlassIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("rating.search")}
                  aria-label={t("rating.search")}
                  className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-subtle hover:text-fg"
                    aria-label={t("common.clear")}
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
              <Button variant={onlyUnanswered ? "primary" : "secondary"} onClick={toggleUnanswered} aria-pressed={!!onlyUnanswered}>
                {t("rating.onlyUnanswered")}
              </Button>
              <Button onClick={() => setCustomDialog({})}>
                <PlusIcon size={14} weight="bold" /> {t("custom.add")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <LevelLegend className="gap-x-3 text-xs" />
              <p className="text-xs text-subtle">{t("rating.legendHint")}</p>
            </div>
          </div>

          <div
            ref={chipBar}
            className="sticky top-14 z-30 -mx-4 flex gap-2 overflow-x-auto border-b border-border bg-bg/90 px-4 py-2 backdrop-blur-md [scrollbar-width:none] lg:hidden"
          >
            {visibleCategories.map((category) => {
              const p = progress.get(category.id)!;
              return (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  data-chip={category.id}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    activeCategory === category.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-fg",
                  )}
                >
                  <CategoryIcon name={category.icon} size={14} />
                  {category.name}
                  <span className="font-mono text-xs opacity-70">
                    {p.answered}/{p.total}
                  </span>
                </a>
              );
            })}
          </div>

          <div className="mt-6 grid gap-10">
            {visibleCategories.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
                {onlyUnanswered && !q ? t("rating.allAnswered") : t("rating.noMatches")}
              </p>
            )}
            {visibleCategories.map((category) => {
              const p = progress.get(category.id)!;
              const percent = p.total ? Math.round((p.answered / p.total) * 100) : 0;
              const description = category.description || (category.items[0]?.custom ? t("custom.privacy") : "");
              return (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  data-category={category.id}
                  aria-labelledby={`category-${category.id}-title`}
                  className="scroll-mt-[calc(var(--bars)-2rem)]"
                >
                  <div className="sticky top-[calc(3.5rem+var(--bars))] z-20 -mx-4 flex items-center gap-3 bg-bg/90 px-4 py-2.5 backdrop-blur-md lg:mx-0 lg:px-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <CategoryIcon name={category.icon} size={17} />
                    </span>
                    <h2 id={`category-${category.id}-title`} className="min-w-0 truncate text-lg font-semibold tracking-tight">
                      {category.name}
                    </h2>
                    <div className="ml-auto flex shrink-0 items-center gap-2.5">
                      <div className="hidden h-1 w-24 overflow-hidden rounded-full bg-surface-2 sm:block" aria-hidden>
                        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
                      </div>
                      {p.total > 0 && p.answered === p.total ? (
                        <CheckIcon size={14} weight="bold" className="text-accent" aria-label={t("rating.complete")} />
                      ) : (
                        <span className="font-mono text-xs text-subtle tabular-nums">
                          {p.answered}/{p.total}
                        </span>
                      )}
                    </div>
                  </div>
                  {description && <p className="mb-3 max-w-3xl text-sm text-muted">{description}</p>}
                  <div className="divide-y divide-border rounded-xl border border-border bg-surface">
                    {category.items.map((item) => (
                      <div key={item.id} id={`item-${itemKey(item)}`} className="scroll-mt-40">
                        <ItemCard
                          item={item}
                          data={data}
                          layout="row"
                          newSince={item.custom ? undefined : newSince}
                          onRate={setAnswer}
                          onExperience={setExperience}
                          onNote={onNote}
                          onEditCustom={item.custom ? onEditCustom : undefined}
                        />
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
        <div className="mx-auto flex max-w-[120rem] items-center gap-3 px-4 py-3 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-mono font-medium tabular-nums">{stats.percent}%</span>
              <span className="truncate text-muted">{t("rating.progress", { answered: stats.answered, total: stats.total })}</span>
            </div>
            <div className="mt-1.5 h-1 max-w-md overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${stats.percent}%` }} />
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setConfirmReset(true)} disabled={stats.answered === 0}>
            {t("rating.reset")}
          </Button>
          <Button size="sm" className="hidden md:inline-flex" onClick={jumpToNextUnanswered} disabled={stats.answered === stats.total}>
            {t("rating.nextUnanswered")}
          </Button>
          <Link href={href(`/list/${list.slug}/results`)} className={buttonClass("primary", "md")}>
            {t("rating.results")} <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>

      <Celebration slug={list.slug} complete={stats.total > 0 && stats.answered === stats.total} />
      <CustomItemDialog open={!!customDialog} onClose={() => setCustomDialog(null)} slug={list.slug} item={customDialog?.item} />
      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("rating.resetTitle")}
        description={t("rating.resetBody", { count: stats.answered, name: list.name })}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              listStore.clear(list.slug);
              setConfirmReset(false);
            }}
          >
            {t("rating.resetConfirm")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
