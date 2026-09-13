import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { ActivityList } from "@/components/admin/activity-list";
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
  const entries = await getAuditLog(200);
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      <p className="mt-1 text-sm text-muted">The last 200 changes made by editors.</p>
      <ActivityList entries={entries} className="mt-6" />
    </section>
  );
}
