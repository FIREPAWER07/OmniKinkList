import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { AdminNav } from "@/components/admin/admin-nav";
import { countPendingSuggestions } from "@/lib/admin/queries";
import { requirePageRole } from "@/lib/session";

export const metadata: Metadata = { title: "Editor", robots: { index: false, follow: false } };

/** The editor is English-only, whatever language the rest of the site is shown in. */
export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8" lang="en">
      <Suspense fallback={<AdminLoading />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </div>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("trusted", "/admin");
  const pending = await countPendingSuggestions();
  return (
    <>
      <AdminNav role={user.role} pendingSuggestions={pending} />
      <div className="mt-8">{children}</div>
    </>
  );
}
