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
        People create a normal account, then an admin gives them the editor role here. Editors can change and publish every list;
        admins can also create or delete lists and manage roles. Editors must turn on two-factor authentication before they can edit.
      </p>
      <UserTable currentUserId={me.id} users={users.map((u) => ({ ...u, twoFactorEnabled: !!u.twoFactorEnabled, createdAt: u.createdAt.toISOString() }))} />
    </section>
  );
}
