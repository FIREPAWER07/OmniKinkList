"use client";

import { CheckIcon, NotePencilIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { memo, useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { itemChoices, itemKey, optionKey } from "@/lib/kinks/choices";
import { NOTE_MAX } from "@/lib/kinks/list-data";
import type { Experience, KinkItem, Level, ListData } from "@/lib/kinks/types";
import { ExperienceToggle, Rater } from "./rater";

export interface ItemHandlers {
  onRate: (key: string, level: Level | null) => void;
  onExperience: (key: string, value: Experience | null) => void;
  onNote?: (itemKey: string, note: string) => void;
  onEditCustom?: (item: KinkItem) => void;
}

interface ItemCardProps extends ItemHandlers {
  item: KinkItem;
  data: Pick<ListData, "answers" | "experience" | "notes">;
  /** Epoch ms of the previous visit; items published after it get a "New" badge. */
  newSince?: number;
  /**
   * `card` stacks everything in one narrow column. `row` is for full-width lists: options flow into
   * aligned columns, and the name moves to its own column once the row is wide enough.
   */
  layout?: "card" | "row";
  className?: string;
}

function isNewer(date: string | undefined, since: number | undefined) {
  return !!since && !!date && Date.parse(date) > since;
}

function sameAnswers(prev: ItemCardProps, next: ItemCardProps) {
  if (prev.item !== next.item || prev.newSince !== next.newSince || prev.className !== next.className || prev.layout !== next.layout) {
    return false;
  }
  if (prev.data.notes[itemKey(prev.item)] !== next.data.notes[itemKey(next.item)]) return false;
  return itemChoices(next.item).every(
    (c) => prev.data.answers[c.key] === next.data.answers[c.key] && prev.data.experience[c.key] === next.data.experience[c.key],
  );
}

interface Row {
  key: string;
  label: string;
  isNew: boolean;
}

export const ItemCard = memo(function ItemCard({
  item,
  data,
  newSince,
  layout = "card",
  className,
  onRate,
  onExperience,
  onNote,
  onEditCustom,
}: ItemCardProps) {
  const t = useT();
  const key = itemKey(item);
  const note = data.notes[key] ?? "";
  const [editingNote, setEditingNote] = useState(false);
  const [draft, setDraft] = useState(note);
  const isNew = isNewer(item.addedAt, newSince);
  const row = layout === "row";

  const toRow = (option: KinkItem["options"][number]): Row => ({
    key: optionKey(item, option.id),
    label: option.label,
    isNew: isNewer(option.addedAt, newSince) && !isNew,
  });
  const roles = item.options.filter((o) => o.kind === "role").map(toRow);
  const variants = item.options.filter((o) => o.kind !== "role").map(toRow);
  const grouped = roles.length > 0 && variants.length > 0;
  const choices = itemChoices(item);
  const answered = choices.filter((c) => data.answers[c.key]).length;
  const complete = answered === choices.length;

  const saveNote = () => {
    setEditingNote(false);
    if (draft !== note) onNote?.(key, draft);
  };

  const renderRow = ({ key: k, label, isNew: newOption }: Row) => {
    const aria = label ? `${item.name}: ${label}` : item.name;
    return (
      <li key={k} className="-mx-2 flex min-h-9 items-center gap-1 rounded-lg px-2 py-0.5 hover:bg-surface-2">
        <span className="min-w-0 flex-1 text-sm leading-snug">
          {label}
          {newOption && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" role="img" aria-label={t("rating.newOption")} data-tooltip={t("rating.newOption")} />}
        </span>
        <ExperienceToggle label={aria} value={data.experience[k]} onChange={(v) => onExperience(k, v)} />
        <Rater label={aria} value={data.answers[k]} onChange={(level) => onRate(k, level)} />
      </li>
    );
  };

  // In rows, options fill as many equal columns as fit, so raters line up across every item of a category.
  const listClass = row ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-x-6 gap-y-0.5" : "grid gap-0.5";

  const header = (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium leading-snug">
            {item.name}
            {isNew && (
              <span className="ml-2 inline-flex rounded-full bg-accent-soft px-1.5 py-px align-middle text-[11px] font-semibold text-accent">
                {t("rating.new")}
              </span>
            )}
          </h3>
          {item.description && <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>}
        </div>
        {item.options.length > 0 &&
          (row && complete ? (
            <CheckIcon size={14} weight="bold" className="mt-1 shrink-0 text-accent" aria-label={t("rating.complete")} />
          ) : (
            <span className="mt-1 shrink-0 font-mono text-xs text-subtle tabular-nums">
              {answered}/{item.options.length}
            </span>
          ))}
        {item.custom && onEditCustom && (
          <button
            type="button"
            onClick={() => onEditCustom(item)}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg"
            aria-label={t("custom.edit")}
            data-tooltip={t("custom.edit")}
          >
            <PencilSimpleIcon size={15} aria-hidden />
          </button>
        )}
        {onNote && (
          <button
            type="button"
            onClick={() => {
              setDraft(note);
              setEditingNote((v) => !v);
            }}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-lg hover:bg-surface-2",
              note ? "text-accent" : "text-subtle hover:text-fg",
            )}
            aria-label={note ? t("notes.edit") : t("notes.add")}
            aria-expanded={editingNote}
            data-tooltip={note ? t("notes.edit") : t("notes.add")}
          >
            <NotePencilIcon size={15} weight={note ? "fill" : "regular"} aria-hidden />
          </button>
        )}
      </div>

      {editingNote ? (
        <textarea
          autoFocus
          value={draft}
          maxLength={NOTE_MAX}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveNote}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraft(note);
              setEditingNote(false);
            }
          }}
          placeholder={t("notes.placeholder")}
          aria-label={t("notes.label", { item: item.name })}
          rows={2}
          className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-subtle focus:border-accent focus:outline-none"
        />
      ) : (
        note && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border-l-2 border-accent bg-surface-2 px-3 py-1.5 text-sm text-muted">{note}</p>
        )
      )}
    </div>
  );

  const answers =
    item.options.length === 0 ? (
      row ? (
        <ul className={listClass}>{renderRow({ key, label: "", isNew: false })}</ul>
      ) : (
        <div className="flex items-center justify-end gap-1">
          <ExperienceToggle label={item.name} value={data.experience[key]} onChange={(v) => onExperience(key, v)} />
          <Rater label={item.name} value={data.answers[key]} onChange={(level) => onRate(key, level)} />
        </div>
      )
    ) : (
      <div className="grid gap-2">
        {grouped && <p className="text-xs font-medium text-subtle">{t("rating.roles")}</p>}
        {roles.length > 0 && <ul className={listClass}>{roles.map(renderRow)}</ul>}
        {grouped && <p className="mt-1 text-xs font-medium text-subtle">{t("rating.variants")}</p>}
        {variants.length > 0 && <ul className={listClass}>{variants.map(renderRow)}</ul>}
      </div>
    );

  if (row) {
    return (
      <article className={cn("@container px-4 py-4 lg:px-5", isNew && "bg-accent-soft/40", className)}>
        <div className="grid gap-x-8 gap-y-3 @min-[63.5rem]:grid-cols-[16rem_minmax(0,1fr)]">
          {header}
          {answers}
        </div>
      </article>
    );
  }

  return (
    <article className={cn("grid gap-3 rounded-xl border border-border bg-surface p-4", isNew && "border-accent/50", className)}>
      {header}
      {answers}
    </article>
  );
}, sameAnswers);
