import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requirePageRole } from "@/lib/session";

export const metadata: Metadata = { title: "Edit content", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">
      <Suspense fallback={<AdminSkeleton />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </div>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("trusted", "/admin");
  return (
    <>
      <AdminNav role={user.role} />
      <div className="mt-8">{children}</div>
    </>
  );
}

function AdminSkeleton() {
  return (
    <div aria-busy="true" className="grid animate-pulse gap-6">
      <div className="h-10 w-80 rounded-lg bg-surface-2" />
      <div className="h-40 rounded-xl bg-surface-2" />
      <div className="h-64 rounded-xl bg-surface-2" />
    </div>
  );
}
