import type { AuditEntry } from "@/lib/admin/queries";
import { cn } from "@/lib/cn";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function ActivityList({ entries, compact, className }: { entries: AuditEntry[]; compact?: boolean; className?: string }) {
  if (entries.length === 0) {
    return <p className={cn("rounded-xl border border-dashed border-border p-6 text-sm text-muted", className)}>No changes yet.</p>;
  }
  return (
    <ol className={cn("grid", compact ? "gap-3" : "divide-y divide-border rounded-xl border border-border bg-surface", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className={compact ? "text-sm" : "grid gap-1 px-5 py-3 text-sm sm:grid-cols-[1fr_auto] sm:gap-6"}>
          <p className="leading-snug">
            <span className="font-medium">{entry.userName}</span> <span className="text-muted">{entry.summary}</span>
            {!compact && entry.listSlug && <span className="ml-2 font-mono text-xs text-subtle">/{entry.listSlug}</span>}
          </p>
          <time dateTime={entry.createdAt.toISOString()} className="font-mono text-xs text-subtle">
            {dateFormat.format(entry.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
