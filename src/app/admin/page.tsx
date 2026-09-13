import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { ActivityList } from "@/components/admin/activity-list";
import { NewListButton } from "@/components/admin/list-forms";
import { buttonClass } from "@/components/ui/button";
import { getAuditLog } from "@/lib/admin/queries";
import { getListSummaries } from "@/lib/kinks/data";
import { hasRole } from "@/lib/roles";
import { requirePageRole } from "@/lib/session";

export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const user = await requirePageRole("trusted", "/admin");
  const [summaries, activity] = await Promise.all([getListSummaries(), getAuditLog(8)]);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lists</h1>
            <p className="mt-1 text-sm text-muted">Changes go live for everyone as soon as you save them.</p>
          </div>
          {hasRole(user.role, "admin") && <NewListButton />}
        </div>
        <div className="mt-6 grid gap-3">
          {summaries.map((list) => (
            <div
              key={list.slug}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5"
            >
              <div>
                <p className="font-medium">
                  {list.name} <span className="ml-1 font-mono text-xs text-subtle">/{list.slug}</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {list.categoryCount} categories, {list.itemCount} items, {list.choiceCount} answers
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/list/${list.slug}`} className={buttonClass("ghost", "sm")}>
                  View
                </Link>
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
        <ActivityList entries={activity} compact className="mt-4" />
      </aside>
    </div>
  );
}
