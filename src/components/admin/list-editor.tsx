"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  CaretDownIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCategory,
  deleteItem,
  deleteList,
  moveCategory,
  moveItem,
  type ActionResult,
} from "@/app/admin/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import type { KinkCategory, KinkItem, KinkList } from "@/lib/kinks/types";
import { ItemDialog } from "./item-dialog";
import { CategoryDialog, ListDetailsDialog } from "./list-forms";

type Editing =
  | { kind: "details" }
  | { kind: "category"; category?: KinkCategory }
  | { kind: "item"; categoryId: number; item?: KinkItem }
  | { kind: "confirm"; title: string; description: string; action: () => Promise<ActionResult>; done: string }
  | null;

export function ListEditor({ list, canDeleteList }: { list: KinkList; canDeleteList: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const close = () => setEditing(null);

  const run = (action: () => Promise<ActionResult>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });

  const q = query.trim().toLowerCase();
  const matches = (item: KinkItem) =>
    !q || item.name.toLowerCase().includes(q) || item.options.some((o) => o.label.toLowerCase().includes(q));
  const categoryOptions = list.categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div aria-busy={pending}>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon size={14} /> All lists
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{list.description || "No description yet."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/list/${list.slug}`} className={buttonClass("ghost", "sm")}>
            View live
          </Link>
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
                  title: `Delete the ${list.name} list?`,
                  description: "Every category, item, and option in it is deleted for everyone. This cannot be undone.",
                  action: async () => {
                    const result = await deleteList(list.slug);
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Input
          type="search"
          placeholder="Filter items or options"
          aria-label="Filter items"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" onClick={() => setEditing({ kind: "category" })}>
          <PlusIcon size={14} weight="bold" /> Category
        </Button>
      </div>

      <div className="mt-4 grid gap-3">
        {list.categories.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
            This list has no categories yet. Add one to start.
          </p>
        )}
        {list.categories.map((category, categoryIndex) => {
          const visible = category.items.filter(matches);
          if (q && visible.length === 0) return null;
          return (
            <details key={category.id} open className="group rounded-xl border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <CaretDownIcon size={14} className="shrink-0 text-subtle transition-transform group-[:not([open])]:-rotate-90" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {category.name} <span className="ml-1 font-mono text-xs text-subtle">{category.items.length}</span>
                  </p>
                  {category.description && <p className="truncate text-xs text-muted">{category.description}</p>}
                </div>
                <div className="flex shrink-0 gap-0.5" onClick={(event) => event.preventDefault()}>
                  <Button size="icon" variant="ghost" aria-label="Move category up" disabled={categoryIndex === 0 || pending} onClick={() => run(() => moveCategory(category.id, "up"))}>
                    <ArrowUpIcon size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Move category down" disabled={categoryIndex === list.categories.length - 1 || pending} onClick={() => run(() => moveCategory(category.id, "down"))}>
                    <ArrowDownIcon size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Edit category" onClick={() => setEditing({ kind: "category", category })}>
                    <PencilSimpleIcon size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete category"
                    onClick={() =>
                      setEditing({
                        kind: "confirm",
                        title: `Delete ${category.name}?`,
                        description: `This also deletes its ${category.items.length} items and their options.`,
                        action: () => deleteCategory(category.id),
                        done: "Category deleted",
                      })
                    }
                  >
                    <TrashIcon size={14} />
                  </Button>
                </div>
              </summary>

              <ul className="divide-y divide-border border-t border-border">
                {visible.map((item) => {
                  const index = category.items.indexOf(item);
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/60">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="truncate text-xs text-muted">
                          {item.options.length > 0 ? item.options.map((o) => o.label).join(", ") : "Single answer"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Button size="icon" variant="ghost" aria-label={`Move ${item.name} up`} disabled={index === 0 || pending || !!q} onClick={() => run(() => moveItem(item.id, "up"))}>
                          <ArrowUpIcon size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Move ${item.name} down`} disabled={index === category.items.length - 1 || pending || !!q} onClick={() => run(() => moveItem(item.id, "down"))}>
                          <ArrowDownIcon size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Edit ${item.name}`} onClick={() => setEditing({ kind: "item", categoryId: category.id, item })}>
                          <PencilSimpleIcon size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${item.name}`}
                          onClick={() =>
                            setEditing({
                              kind: "confirm",
                              title: `Delete ${item.name}?`,
                              description: "Saved answers for this item stop showing in results, share links, and exports.",
                              action: () => deleteItem(item.id),
                              done: "Item deleted",
                            })
                          }
                        >
                          <TrashIcon size={14} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-border px-4 py-2.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: "item", categoryId: category.id })}>
                  <PlusIcon size={14} weight="bold" /> Add item
                </Button>
              </div>
            </details>
          );
        })}
      </div>

      <ListDetailsDialog open={editing?.kind === "details"} onClose={close} list={list} />
      <CategoryDialog
        key={editing?.kind === "category" ? (editing.category?.id ?? "new") : "closed"}
        open={editing?.kind === "category"}
        onClose={close}
        listSlug={list.slug}
        category={editing?.kind === "category" ? editing.category : undefined}
      />
      <ItemDialog
        open={editing?.kind === "item"}
        onClose={close}
        categories={categoryOptions}
        categoryId={editing?.kind === "item" ? editing.categoryId : (list.categories[0]?.id ?? 0)}
        item={editing?.kind === "item" ? editing.item : undefined}
      />
      <Dialog
        open={editing?.kind === "confirm"}
        onClose={close}
        title={editing?.kind === "confirm" ? editing.title : ""}
        description={editing?.kind === "confirm" ? editing.description : undefined}
      >
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
