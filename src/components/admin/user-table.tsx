"use client";

import { ShieldCheckIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input, Select } from "@/components/ui/field";
import { setUserRole } from "@/lib/admin/actions";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

const joinedFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

interface Row {
  id: string;
  name: string;
  email: string;
  role: Role;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export function UserTable({ users, currentUserId }: { users: Row[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : users;

  const change = (row: Row, role: Role) => {
    setPendingId(row.id);
    startTransition(async () => {
      const result = await setUserRole(row.id, role);
      setPendingId(null);
      if (result.ok) toast.success(`${row.name} is now ${ROLE_LABELS[role].toLowerCase()}`);
      else toast.error(result.error);
    });
  };

  return (
    <div className="mt-6">
      <Input type="search" placeholder="Search by name or email" aria-label="Search users" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-border text-xs text-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">2FA</th>
              <th className="px-5 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3">
                  <p className="font-medium">
                    {row.name}
                    {row.id === currentUserId && <span className="ml-2 text-xs text-subtle">(you)</span>}
                  </p>
                  <p className="text-muted">{row.email}</p>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{joinedFormat.format(new Date(row.createdAt))}</td>
                <td className="px-5 py-3">
                  {row.twoFactorEnabled ? <ShieldCheckIcon size={18} weight="fill" className="text-like" aria-label="On" /> : <span className="text-subtle">Off</span>}
                </td>
                <td className="px-5 py-3">
                  <Select
                    aria-label={`Role for ${row.name}`}
                    value={row.role}
                    disabled={row.id === currentUserId || pendingId === row.id}
                    onChange={(event) => change(row, event.target.value as Role)}
                    className="h-9 w-44"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted">
                  No users match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
