"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { restoreVersion } from "@/lib/admin/actions";
import type { ListChanges } from "@/lib/kinks/published";
import { changeLines } from "./publish-bar";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

interface Version {
  version: number;
  note: string;
  changes: string;
  publishedByName: string;
  publishedAt: string;
}

export function VersionList({ slug, versions }: { slug: string; versions: Version[] }) {
  const [confirm, setConfirm] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  if (versions.length === 0) return <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted">This list has never been published.</p>;

  return (
    <>
      <ol className="mt-6 grid gap-3">
        {versions.map((v, index) => (
          <li key={v.version} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  Version {v.version} {index === 0 && <span className="ml-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Live</span>}
                </p>
                <p className="text-sm text-muted">
                  {v.publishedByName}, {dateFormat.format(new Date(v.publishedAt))}
                </p>
              </div>
              <Button size="sm" onClick={() => setConfirm(v.version)}>
                Restore into draft
              </Button>
            </div>
            {v.note && <p className="mt-3 text-sm">{v.note}</p>}
            <ul className="mt-2 grid list-disc gap-0.5 pl-5 text-sm text-muted">
              {(v.version === 1 ? ["First version"] : changeLines(JSON.parse(v.changes) as ListChanges)).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} title={`Restore version ${confirm}?`} description="The current draft is replaced by this version. Publish afterwards to make it live again.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (confirm === null) return;
                const result = await restoreVersion(slug, confirm);
                if (result.ok) {
                  toast.success(`Version ${confirm} copied into the draft`);
                  setConfirm(null);
                } else toast.error(result.error);
              })
            }
          >
            Restore
          </Button>
        </div>
      </Dialog>
    </>
  );
}
