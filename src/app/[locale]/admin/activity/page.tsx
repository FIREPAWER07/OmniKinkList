import { Suspense } from "react";
import { ActivityList } from "@/components/admin/activity-list";
import { AdminLoading } from "@/components/admin/admin-loading";
import { getAuditLog } from "@/lib/admin/queries";
import { requirePageRole } from "@/lib/session";

export default function ActivityPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Activity />
    </Suspense>
  );
}

async function Activity() {
  await requirePageRole("trusted", "/admin/activity");
  const entries = await getAuditLog(300);
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        The last 300 changes. Undo reverses a change in the draft; publish afterwards to make it live.
      </p>
      <ActivityList entries={entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString(), revertedAt: e.revertedAt?.toISOString() ?? null }))} className="mt-6" />
    </section>
  );
}
