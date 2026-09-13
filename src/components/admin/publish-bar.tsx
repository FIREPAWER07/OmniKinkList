"use client";

import { RocketLaunchIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { publishList, restoreVersion } from "@/lib/admin/actions";
import { isEmptyChange, type ListChanges } from "@/lib/kinks/published";

export function changeLines(changes: ListChanges) {
  const lines: string[] = [];
  const names = (refs: { name: string }[]) => refs.slice(0, 6).map((r) => r.name).join(", ") + (refs.length > 6 ? ` and ${refs.length - 6} more` : "");
  if (changes.detailsChanged) lines.push("List details changed");
  if (changes.addedCategories.length) lines.push(`New categories: ${names(changes.addedCategories)}`);
  if (changes.removedCategories.length) lines.push(`Removed categories: ${names(changes.removedCategories)}`);
  if (changes.addedItems.length) lines.push(`New items: ${names(changes.addedItems)}`);
  if (changes.removedItems.length) lines.push(`Removed items: ${names(changes.removedItems)}`);
  if (changes.renamedItems.length) lines.push(`Renamed: ${changes.renamedItems.map((r) => `${r.from} → ${r.name}`).join(", ")}`);
  if (changes.editedItems.length) lines.push(`Edited: ${names(changes.editedItems)}`);
  if (changes.addedOptions.length) lines.push(`${changes.addedOptions.length} new options`);
  if (changes.removedOptions.length) lines.push(`${changes.removedOptions.length} removed options`);
  if (changes.translatedLocales.length) lines.push(`Translations updated: ${changes.translatedLocales.join(", ").toUpperCase()}`);
  return lines;
}

export function PublishBar({ slug, changes, neverPublished }: { slug: string; changes: ListChanges | null; neverPublished: boolean }) {
  const [dialog, setDialog] = useState<"publish" | "discard" | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const hasChanges = neverPublished || (changes && !isEmptyChange(changes));
  const lines = changes ? changeLines(changes) : [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-sm">
          {hasChanges ? (
            <span className="text-maybe">{neverPublished ? "This list has never been published." : `Draft has unpublished changes (${lines.length}).`}</span>
          ) : (
            <span className="text-muted">The draft matches the live version.</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/lists/${slug}/versions`} className={buttonClass("ghost", "sm")}>
            Versions
          </Link>
          {hasChanges && !neverPublished && (
            <Button size="sm" variant="ghost" onClick={() => setDialog("discard")}>
              Discard changes
            </Button>
          )}
          <Button size="sm" variant="primary" disabled={!hasChanges} onClick={() => setDialog("publish")}>
            <RocketLaunchIcon size={14} /> Publish
          </Button>
        </div>
      </div>

      <Dialog open={dialog === "publish"} onClose={() => setDialog(null)} title="Publish a new version" description="Everyone sees these changes right away, and they show up in the public changelog.">
        <div className="grid gap-4">
          {lines.length > 0 && (
            <ul className="grid max-h-60 list-disc gap-1 overflow-y-auto rounded-lg bg-surface-2 py-3 pl-8 pr-3 text-sm text-muted">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <Field label="Note for the changelog (optional)" htmlFor="publish-note">
            <Textarea id="publish-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await publishList(slug, note);
                  if (result.ok) {
                    toast.success(`Published version ${result.data?.version}`);
                    setNote("");
                    setDialog(null);
                  } else toast.error(result.error);
                })
              }
            >
              Publish now
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === "discard"} onClose={() => setDialog(null)} title="Discard unpublished changes?" description="The draft goes back to the live version. Everything changed since the last publish is lost.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await restoreVersion(slug);
                if (result.ok) {
                  toast.success("Draft reset to the live version");
                  setDialog(null);
                } else toast.error(result.error);
              })
            }
          >
            Discard changes
          </Button>
        </div>
      </Dialog>
    </>
  );
}
