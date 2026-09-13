import Link from "next/link";
import { Suspense } from "react";
import { ActivityList } from "@/components/admin/activity-list";
import { AdminLoading } from "@/components/admin/admin-loading";
import { NewListButton } from "@/components/admin/list-forms";
import { buttonClass } from "@/components/ui/button";
import { getAuditLog, getDraftOverview } from "@/lib/admin/queries";
import { hasRole } from "@/lib/roles";
import { requirePageRole } from "@/lib/session";

export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminHome />
    </Suspense>
  );
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

async function AdminHome() {
  const user = await requirePageRole("trusted", "/admin");
  const [overview, activity] = await Promise.all([getDraftOverview(), getAuditLog(8)]);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lists</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              You edit a draft. Nobody sees your changes until someone publishes a new version of the list.
            </p>
          </div>
          {hasRole(user.role, "admin") && <NewListButton />}
        </div>
        <div className="mt-6 grid gap-3">
          {overview.map((list) => (
            <div key={list.slug} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {list.name} <span className="font-mono text-xs text-subtle">/{list.slug}</span>
                  {list.unpublished && <span className="rounded-full bg-maybe/15 px-2 py-0.5 text-xs font-medium text-maybe">Unpublished changes</span>}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {list.categoryCount} categories, {list.itemCount} items.{" "}
                  {list.version ? `Live version ${list.version}, published ${dateFormat.format(list.publishedAt!)}.` : "Never published."}
                </p>
              </div>
              <div className="flex gap-2">
                {list.version && (
                  <Link href={`/list/${list.slug}`} className={buttonClass("ghost", "sm")}>
                    View live
                  </Link>
                )}
                <Link href={`/admin/lists/${list.slug}`} className={buttonClass("secondary", "sm")}>
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Recent changes</h2>
          <Link href="/admin/activity" className="text-sm text-accent hover:underline">
            All activity
          </Link>
        </div>
        <ActivityList entries={activity.map((e) => ({ ...e, createdAt: e.createdAt.toISOString(), revertedAt: e.revertedAt?.toISOString() ?? null }))} compact className="mt-4" />
      </aside>
    </div>
  );
}
