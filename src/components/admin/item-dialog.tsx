"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { duplicateItem, saveItem, type ActionResult } from "@/lib/admin/actions";
import type { KinkItem, OptionKind } from "@/lib/kinks/types";
import { FormFooter, useActionForm } from "./list-forms";

export interface CategoryChoice {
  id: number;
  name: string;
  listSlug: string;
  listName: string;
}

interface DraftOption {
  key: string;
  id?: number;
  label: string;
  kind: OptionKind;
}

export interface ItemDraft {
  name: string;
  description: string;
  options: { label: string; kind: OptionKind }[];
}

export function ItemDialog({
  open,
  onClose,
  categories,
  categoryId,
  item,
  initial,
  title,
  onSubmitOverride,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryChoice[];
  categoryId: number;
  item?: KinkItem;
  /** Prefills a new item, for accepting suggestions. */
  initial?: ItemDraft;
  title?: string;
  onSubmitOverride?: (input: Parameters<typeof saveItem>[0]) => Promise<ActionResult<unknown>>;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title ?? (item ? `Edit ${item.name}` : "New item")} className="max-w-2xl">
      <ItemForm key={`${item?.id ?? "new"}-${categoryId}`} onClose={onClose} categories={categories} categoryId={categoryId} item={item} initial={initial} onSubmitOverride={onSubmitOverride} />
    </Dialog>
  );
}

function ItemForm({
  onClose,
  categories,
  categoryId,
  item,
  initial,
  onSubmitOverride,
}: {
  onClose: () => void;
  categories: CategoryChoice[];
  categoryId: number;
  item?: KinkItem;
  initial?: ItemDraft;
  onSubmitOverride?: (input: Parameters<typeof saveItem>[0]) => Promise<ActionResult<unknown>>;
}) {
  const nextKey = useRef(0);
  const [draft, setDraft] = useState<DraftOption[]>(() =>
    item
      ? item.options.map((o) => ({ key: `o${o.id}`, id: o.id, label: o.label, kind: o.kind }))
      : (initial?.options ?? []).map((o, i) => ({ key: `init${i}`, label: o.label, kind: o.kind })),
  );
  const [copyTarget, setCopyTarget] = useState(categoryId);
  const { pending, error, submit } = useActionForm(onClose, item ? "Item saved" : "Item added");
  const removedCount = item ? item.options.filter((o) => !draft.some((d) => d.id === o.id)).length : 0;
  const byList = Object.groupBy(categories, (c) => c.listName);

  const update = (key: string, patch: Partial<DraftOption>) => setDraft((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)));
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
    const input = {
      id: item?.id,
      categoryId: Number(form.get("categoryId")),
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      // Roles first, then variants, keeping the order within each group.
      options: [...draft.filter((o) => o.kind === "role"), ...draft.filter((o) => o.kind !== "role")]
        .filter((o) => o.label.trim())
        .map((o) => ({ id: o.id, label: o.label, kind: o.kind })),
    };
    submit(() => (onSubmitOverride ? onSubmitOverride(input) : saveItem(input)));
  };

  const categorySelect = (name: string, value: number, onChange?: (id: number) => void) => (
    <Select id={name} name={name} defaultValue={onChange ? undefined : value} value={onChange ? value : undefined} onChange={onChange ? (e) => onChange(Number(e.target.value)) : undefined}>
      {Object.entries(byList).map(([listName, group]) => (
        <optgroup key={listName} label={listName}>
          {group!.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="Name" htmlFor="item-name">
          <Input id="item-name" name="name" defaultValue={item?.name ?? initial?.name} required maxLength={80} />
        </Field>
        <Field label="Category" htmlFor="categoryId" hint={item ? "Pick another list's category to move it." : undefined}>
          {categorySelect("categoryId", categoryId)}
        </Field>
      </div>
      <Field label="Description" htmlFor="item-description">
        <Textarea id="item-description" name="description" defaultValue={item?.description ?? initial?.description} maxLength={300} rows={2} />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Options</legend>
        <p className="-mt-1 text-xs text-muted">
          Roles are the parts people can take (Giving, Receiving, Dominant). Variations are kinds, materials, or intensities (Metal, Light, Public).
          Leave empty for a single answer.
        </p>
        {draft.length > 0 && (
          <ol className="grid gap-1.5">
            {draft.map((option, index) => (
              <li key={option.key} className="flex items-center gap-1.5">
                <Select aria-label={`Option ${index + 1} type`} value={option.kind} onChange={(e) => update(option.key, { kind: e.target.value as OptionKind })} className="h-9 w-32 shrink-0">
                  <option value="role">Role</option>
                  <option value="variant">Variation</option>
                </Select>
                <Input aria-label={`Option ${index + 1}`} value={option.label} onChange={(e) => update(option.key, { label: e.target.value })} maxLength={50} autoFocus={!option.id && option.label === ""} className="h-9" />
                <Button size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move option up">
                  <ArrowUpIcon size={14} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Move option down">
                  <ArrowDownIcon size={14} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDraft((prev) => prev.filter((o) => o.key !== option.key))} aria-label="Remove option">
                  <TrashIcon size={14} />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-2">
          {(["role", "variant"] as const).map((kind) => (
            <Button key={kind} size="sm" variant="secondary" onClick={() => setDraft((prev) => [...prev, { key: `new${nextKey.current++}`, label: "", kind }])} disabled={draft.length >= 24}>
              <PlusIcon size={14} weight="bold" /> {kind === "role" ? "Role" : "Variation"}
            </Button>
          ))}
        </div>
        {removedCount > 0 && (
          <p className="flex gap-2 rounded-lg bg-maybe/10 p-2.5 text-xs text-muted">
            <WarningIcon size={14} className="mt-px shrink-0 text-maybe" aria-hidden />
            Removing {removedCount} existing {removedCount === 1 ? "option" : "options"} drops those answers from results and old share links once published.
          </p>
        )}
      </fieldset>

      {item && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-surface-2 p-3">
          <Field label="Copy this item to" htmlFor="copyTarget" className="min-w-52 flex-1">
            {categorySelect("copyTarget", copyTarget, setCopyTarget)}
          </Field>
          <Button
            onClick={async () => {
              const result = await duplicateItem(item.id, copyTarget);
              if (result.ok) toast.success("Item copied");
              else toast.error(result.error);
            }}
          >
            Copy
          </Button>
        </div>
      )}

      <FormFooter error={error} pending={pending} onCancel={onClose} label={item ? "Save item" : "Add item"} />
    </form>
  );
}
