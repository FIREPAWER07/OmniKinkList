"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeftIcon, CaretDownIcon, DotsSixVerticalIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/kinks/category-icon";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { LOCALE_NAMES, TRANSLATION_LOCALES } from "@/i18n/config";
import { deleteCategory, deleteItem, deleteList, reorderCategories, reorderItems, type ActionResult } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";
import type { ListChanges, PublishedData } from "@/lib/kinks/published";
import type { KinkCategory, KinkItem } from "@/lib/kinks/types";
import { ItemDialog, type CategoryChoice } from "./item-dialog";
import { CategoryDialog, ListDetailsDialog } from "./list-forms";
import { PublishBar } from "./publish-bar";
import { TranslationEditor } from "./translation-editor";

type Editing =
  | { kind: "details" }
  | { kind: "category"; category?: KinkCategory }
  | { kind: "item"; categoryId: number; item?: KinkItem }
  | { kind: "confirm"; title: string; description: string; action: () => Promise<ActionResult<unknown>>; done: string }
  | null;

type Mode = "content" | (typeof TRANSLATION_LOCALES)[number];

export function ListEditor({
  draft,
  changes,
  neverPublished,
  allCategories,
  canDeleteList,
}: {
  draft: PublishedData;
  changes: ListChanges | null;
  neverPublished: boolean;
  allCategories: CategoryChoice[];
  canDeleteList: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("content");
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [categoryOrder, setCategoryOrder] = useSyncedOrder(draft.categories);
  const close = () => setEditing(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const run = (action: () => Promise<ActionResult<unknown>>, success?: string, onFail?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        onFail?.();
      } else if (success) toast.success(success);
    });

  const q = query.trim().toLowerCase();
  const matches = (item: KinkItem) => !q || item.name.toLowerCase().includes(q) || item.options.some((o) => o.label.toLowerCase().includes(q));
  const byId = new Map(draft.categories.map((c) => [c.id, c]));
  const ordered = categoryOrder.map((id) => byId.get(id)).filter((c): c is KinkCategory => !!c);

  const onCategoryDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = categoryOrder;
    const next = arrayMove(previous, previous.indexOf(Number(active.id)), previous.indexOf(Number(over.id)));
    setCategoryOrder(next);
    run(() => reorderCategories(draft.slug, next), undefined, () => setCategoryOrder(previous));
  };

  return (
    <div aria-busy={pending}>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon size={14} /> All lists
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{draft.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{draft.description || "No description yet."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!neverPublished && (
            <Link href={`/list/${draft.slug}`} className={buttonClass("ghost", "sm")}>
              View live
            </Link>
          )}
          <Button size="sm" onClick={() => setEditing({ kind: "details" })}>
            <PencilSimpleIcon size={14} /> Details
          </Button>
          {canDeleteList && (
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                setEditing({
                  kind: "confirm",
                  title: `Delete the ${draft.name} list?`,
                  description: "The list, its draft, and all published versions are deleted for everyone. This cannot be undone.",
                  action: async () => {
                    const result = await deleteList(draft.slug);
                    if (result.ok) router.push("/admin");
                    return result;
                  },
                  done: "List deleted",
                })
              }
            >
              <TrashIcon size={14} /> Delete list
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <PublishBar slug={draft.slug} changes={changes} neverPublished={neverPublished} />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none]" role="tablist">
        {(["content", ...TRANSLATION_LOCALES] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm",
              mode === m ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {m === "content" ? "Content (English)" : LOCALE_NAMES[m]}
          </button>
        ))}
      </div>

      {mode !== "content" ? (
        <div className="mt-6">
          <TranslationEditor key={mode} draft={draft} locale={mode} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Input type="search" placeholder="Filter items or options" aria-label="Filter items" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
            <Button variant="primary" size="sm" onClick={() => setEditing({ kind: "category" })}>
              <PlusIcon size={14} weight="bold" /> Category
            </Button>
          </div>
          {q && <p className="mt-2 text-xs text-subtle">Dragging is paused while filtering.</p>}

          <div className="mt-4">
            {ordered.length === 0 && <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">This list has no categories yet. Add one to start.</p>}
            <DndContext id={`categories-${draft.slug}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
              <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy} disabled={!!q}>
                <div className="grid gap-3">
                  {ordered.map((category) => {
                    const visible = category.items.filter(matches);
                    if (q && visible.length === 0) return null;
                    return (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        dragDisabled={!!q}
                        onEdit={() => setEditing({ kind: "category", category })}
                        onDelete={() =>
                          setEditing({
                            kind: "confirm",
                            title: `Delete ${category.name}?`,
                            description: `This also deletes its ${category.items.length} items and their options from the draft. You can undo it from the activity log.`,
                            action: () => deleteCategory(category.id),
                            done: "Category deleted",
                          })
                        }
                        onAddItem={() => setEditing({ kind: "item", categoryId: category.id })}
                      >
                        <ItemList
                          category={category}
                          filter={q ? matches : null}
                          sensors={sensors}
                          onReorder={(ids, revert) => run(() => reorderItems(category.id, ids), undefined, revert)}
                          onEdit={(item) => setEditing({ kind: "item", categoryId: category.id, item })}
                          onDelete={(item) =>
                            setEditing({
                              kind: "confirm",
                              title: `Delete ${item.name}?`,
                              description: "Once published, saved answers for this item stop showing in results and share links. You can undo it from the activity log.",
                              action: () => deleteItem(item.id),
                              done: "Item deleted",
                            })
                          }
                        />
                      </SortableCategory>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}

      <ListDetailsDialog open={editing?.kind === "details"} onClose={close} list={draft} />
      <CategoryDialog open={editing?.kind === "category"} onClose={close} listSlug={draft.slug} category={editing?.kind === "category" ? editing.category : undefined} />
      <ItemDialog
        open={editing?.kind === "item"}
        onClose={close}
        categories={allCategories}
        categoryId={editing?.kind === "item" ? editing.categoryId : (draft.categories[0]?.id ?? 0)}
        item={editing?.kind === "item" ? editing.item : undefined}
      />
      <Dialog open={editing?.kind === "confirm"} onClose={close} title={editing?.kind === "confirm" ? editing.title : ""} description={editing?.kind === "confirm" ? editing.description : undefined}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (editing?.kind !== "confirm") return;
              const { action, done } = editing;
              run(async () => {
                const result = await action();
                if (result.ok) close();
                return result;
              }, done);
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/** Local order for optimistic drag and drop, reset whenever fresh rows arrive from the server. */
function useSyncedOrder(rows: { id: number }[]) {
  const [state, setState] = useState(() => ({ source: rows, ids: rows.map((r) => r.id) }));
  let current = state;
  if (state.source !== rows) {
    current = { source: rows, ids: rows.map((r) => r.id) };
    setState(current);
  }
  const setIds = (ids: number[]) => setState({ source: rows, ids });
  return [current.ids, setIds] as const;
}

function DragHandle({ label, disabled, ...props }: { label: string; disabled?: boolean } & Record<string, unknown>) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn("grid size-8 shrink-0 touch-none place-items-center rounded-lg text-subtle", disabled ? "opacity-30" : "cursor-grab hover:bg-surface-2 hover:text-fg active:cursor-grabbing")}
      {...props}
    >
      <DotsSixVerticalIcon size={16} weight="bold" aria-hidden />
    </button>
  );
}

function SortableCategory({
  category,
  dragDisabled,
  onEdit,
  onDelete,
  onAddItem,
  children,
}: {
  category: KinkCategory;
  dragDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id, disabled: dragDisabled });
  return (
    <details
      ref={setNodeRef as never}
      open
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("group rounded-xl border border-border bg-surface", isDragging && "relative z-10 shadow-xl shadow-black/30")}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span onClick={(e) => e.preventDefault()}>
          <DragHandle label={`Drag to reorder ${category.name}`} disabled={dragDisabled} {...attributes} {...listeners} />
        </span>
        <CaretDownIcon size={14} className="shrink-0 text-subtle transition-transform group-[:not([open])]:-rotate-90" />
        <CategoryIcon name={category.icon} size={18} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {category.name} <span className="ml-1 font-mono text-xs text-subtle">{category.items.length}</span>
          </p>
          {category.description && <p className="truncate text-xs text-muted">{category.description}</p>}
        </div>
        <div className="flex shrink-0 gap-0.5" onClick={(event) => event.preventDefault()}>
          <Button size="icon" variant="ghost" aria-label="Edit category" onClick={onEdit}>
            <PencilSimpleIcon size={14} />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete category" onClick={onDelete}>
            <TrashIcon size={14} />
          </Button>
        </div>
      </summary>
      {children}
      <div className="border-t border-border px-4 py-2.5">
        <Button size="sm" variant="ghost" onClick={onAddItem}>
          <PlusIcon size={14} weight="bold" /> Add item
        </Button>
      </div>
    </details>
  );
}

function ItemList({
  category,
  filter,
  sensors,
  onReorder,
  onEdit,
  onDelete,
}: {
  category: KinkCategory;
  filter: ((item: KinkItem) => boolean) | null;
  sensors: ReturnType<typeof useSensors>;
  onReorder: (ids: number[], revert: () => void) => void;
  onEdit: (item: KinkItem) => void;
  onDelete: (item: KinkItem) => void;
}) {
  const [order, setOrder] = useSyncedOrder(category.items);
  const byId = new Map(category.items.map((i) => [i.id, i]));
  const items = order.map((id) => byId.get(id)).filter((i): i is KinkItem => !!i).filter((i) => !filter || filter(i));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(previous, previous.indexOf(Number(active.id)), previous.indexOf(Number(over.id)));
    setOrder(next);
    onReorder(next, () => setOrder(previous));
  };

  return (
    <DndContext id={`items-${category.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy} disabled={!!filter}>
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <SortableItem key={item.id} item={item} dragDisabled={!!filter} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ item, dragDisabled, onEdit, onDelete }: { item: KinkItem; dragDisabled: boolean; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: dragDisabled });
  const roles = item.options.filter((o) => o.kind === "role").map((o) => o.label);
  const variants = item.options.filter((o) => o.kind !== "role").map((o) => o.label);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex items-center gap-2 bg-surface px-3 py-2", isDragging && "relative z-10 shadow-lg shadow-black/30")}
    >
      <DragHandle label={`Drag to reorder ${item.name}`} disabled={dragDisabled} {...attributes} {...listeners} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted">
          {item.options.length === 0 ? "Single answer" : [roles.length ? `Roles: ${roles.join(", ")}` : "", variants.length ? `Variations: ${variants.join(", ")}` : ""].filter(Boolean).join(". ")}
        </p>
      </div>
      <Button size="icon" variant="ghost" aria-label={`Edit ${item.name}`} onClick={onEdit}>
        <PencilSimpleIcon size={14} />
      </Button>
      <Button size="icon" variant="ghost" aria-label={`Delete ${item.name}`} onClick={onDelete}>
        <TrashIcon size={14} />
      </Button>
    </li>
  );
}
