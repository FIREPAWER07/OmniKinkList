"use client";

import { ArrowUUpLeftIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { revertEntry } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";

export interface ActivityEntry {
  id: number;
  userName: string;
  summary: string;
  action: string;
  listSlug: string | null;
  entityType: string | null;
  before: string | null;
  revertedAt: string | null;
  revertedByName: string | null;
  createdAt: string;
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function ActivityList({ entries, compact, className }: { entries: ActivityEntry[]; compact?: boolean; className?: string }) {
  const [confirm, setConfirm] = useState<ActivityEntry | null>(null);
  const [pending, startTransition] = useTransition();

  if (entries.length === 0) {
    return <p className={cn("rounded-xl border border-dashed border-border p-6 text-sm text-muted", className)}>No changes yet.</p>;
  }

  return (
    <>
      <ol className={cn("grid", compact ? "gap-3" : "divide-y divide-border rounded-xl border border-border bg-surface", className)}>
        {entries.map((entry) => {
          const undoable = !compact && entry.entityType && entry.before !== null && !entry.revertedAt;
          return (
            <li key={entry.id} className={compact ? "text-sm" : "flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 text-sm"}>
              <div className="min-w-0 flex-1">
                <p className={cn("leading-snug", entry.revertedAt && "line-through opacity-60")}>
                  <span className="font-medium">{entry.userName}</span> <span className="text-muted">{entry.summary}</span>
                  {!compact && entry.listSlug && <span className="ml-2 font-mono text-xs text-subtle">/{entry.listSlug}</span>}
                </p>
                <p className="font-mono text-xs text-subtle">
                  {dateFormat.format(new Date(entry.createdAt))}
                  {entry.revertedAt && ` · undone by ${entry.revertedByName}`}
                </p>
              </div>
              {undoable && (
                <Button size="sm" variant="ghost" onClick={() => setConfirm(entry)}>
                  <ArrowUUpLeftIcon size={14} /> Undo
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Undo this change?"
        description={confirm ? `"${confirm.summary}" will be reversed in the draft. Later edits to the same thing are overwritten. You can undo the undo from the activity log.` : undefined}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!confirm) return;
                const result = await revertEntry(confirm.id);
                if (result.ok) {
                  toast.success("Change undone in the draft");
                  setConfirm(null);
                } else toast.error(result.error);
              })
            }
          >
            Undo change
          </Button>
        </div>
      </Dialog>
    </>
  );
}
