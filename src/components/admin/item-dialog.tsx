"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { saveItem } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { KinkCategory, KinkItem } from "@/lib/kinks/types";
import { FormFooter, useActionForm } from "./list-forms";

interface DraftOption {
  /** Stable React key; `id` is only set for options that already exist. */
  key: string;
  id?: number;
  label: string;
}

export function ItemDialog({
  open,
  onClose,
  categories,
  categoryId,
  item,
}: {
  open: boolean;
  onClose: () => void;
  categories: Pick<KinkCategory, "id" | "name">[];
  categoryId: number;
  item?: KinkItem;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={item ? `Edit ${item.name}` : "New item"} className="max-w-xl">
      {/* Keyed so the draft resets every time the dialog opens for a different item. */}
      <ItemForm key={`${item?.id ?? "new"}-${categoryId}`} onClose={onClose} categories={categories} categoryId={categoryId} item={item} />
    </Dialog>
  );
}

function ItemForm({
  onClose,
  categories,
  categoryId,
  item,
}: {
  onClose: () => void;
  categories: Pick<KinkCategory, "id" | "name">[];
  categoryId: number;
  item?: KinkItem;
}) {
  const nextKey = useRef(0);
  const makeKey = () => `draft-${nextKey.current++}`;
  const [draft, setDraft] = useState<DraftOption[]>(() =>
    (item?.options ?? []).map((o) => ({ key: `o${o.id}`, id: o.id, label: o.label })),
  );
  const { pending, error, submit } = useActionForm(onClose, item ? "Item saved" : "Item added");

  const removedCount = item ? item.options.filter((o) => !draft.some((d) => d.id === o.id)).length : 0;

  const update = (key: string, label: string) => setDraft((prev) => prev.map((o) => (o.key === key ? { ...o, label } : o)));
  const remove = (key: string) => setDraft((prev) => prev.filter((o) => o.key !== key));
  const move = (index: number, delta: number) =>
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit(() =>
      saveItem({
        id: item?.id,
        categoryId: Number(form.get("categoryId")),
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        options: draft.filter((o) => o.label.trim()).map((o) => ({ id: o.id, label: o.label })),
      }),
    );
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Name" htmlFor="item-name">
          <Input id="item-name" name="name" defaultValue={item?.name} required maxLength={80} />
        </Field>
        <Field label="Category" htmlFor="item-category">
          <Select id="item-category" name="categoryId" defaultValue={categoryId}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="item-description">
        <Textarea id="item-description" name="description" defaultValue={item?.description} maxLength={300} rows={2} />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Options</legend>
        <p className="-mt-1 text-xs text-muted">
          Roles or variants people answer separately, like Giving and Receiving. Leave empty for a single answer.
        </p>
        {draft.length > 0 && (
          <ol className="grid gap-1.5">
            {draft.map((option, index) => (
              <li key={option.key} className="flex items-center gap-1.5">
                <Input
                  aria-label={`Option ${index + 1}`}
                  value={option.label}
                  onChange={(event) => update(option.key, event.target.value)}
                  maxLength={50}
                  autoFocus={!option.id}
                  className="h-9"
                />
                <Button size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move option up">
                  <ArrowUpIcon size={14} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Move option down">
                  <ArrowDownIcon size={14} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(option.key)} aria-label="Remove option">
                  <TrashIcon size={14} />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="justify-self-start"
          onClick={() => setDraft((prev) => [...prev, { key: makeKey(), label: "" }])}
          disabled={draft.length >= 24}
        >
          <PlusIcon size={14} weight="bold" /> Add option
        </Button>
        {removedCount > 0 && (
          <p className="flex gap-2 rounded-lg bg-maybe/10 p-2.5 text-xs text-muted">
            <WarningIcon size={14} className="mt-px shrink-0 text-maybe" aria-hidden />
            Removing {removedCount} existing {removedCount === 1 ? "option" : "options"} also removes those answers from
            share links and exports made before.
          </p>
        )}
      </fieldset>

      <FormFooter error={error} pending={pending} onCancel={onClose} label={item ? "Save item" : "Add item"} />
    </form>
  );
}
