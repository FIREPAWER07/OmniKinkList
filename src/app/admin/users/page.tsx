import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { UserTable } from "@/components/admin/user-table";
import { getUsers } from "@/lib/admin/queries";
import { requirePageRole } from "@/lib/session";

export default function UsersPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Users />
    </Suspense>
  );
}

async function Users() {
  const me = await requirePageRole("admin", "/admin/users");
  const users = await getUsers();
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Trusted editors can change every list. Admins can also create or delete lists and manage roles.
      </p>
      <UserTable
        currentUserId={me.id}
        users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      />
    </section>
  );
}
