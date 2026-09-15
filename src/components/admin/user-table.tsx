"use client";

import { ShieldCheckIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { setUserRole } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  twoFactorEnabled: boolean;
  /** Only true while the ban is in effect. */
  banned: boolean;
  createdAt: string;
  lastActiveAt: string | null;
}

export function RoleSelect({ userId, name, role, disabled, className }: { userId: string; name: string; role: Role; disabled?: boolean; className?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      aria-label={`Role for ${name}`}
      value={role}
      disabled={disabled || pending}
      onChange={(event) => {
        const next = event.target.value as Role;
        startTransition(async () => {
          const result = await setUserRole(userId, next);
          if (result.ok) toast.success(`${name} is now ${ROLE_LABELS[next].toLowerCase()}`);
          else toast.error(result.error);
        });
      }}
      className={cn("h-9 w-44", className)}
    >
      {ROLES.map((option) => (
        <option key={option} value={option}>
          {ROLE_LABELS[option]}
        </option>
      ))}
    </Select>
  );
}

export function StatusBadges({ banned, emailVerified }: { banned: boolean; emailVerified: boolean }) {
  if (!banned && emailVerified) return <span className="text-subtle">Active</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {banned && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">Banned</span>}
      {!emailVerified && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Email not confirmed</span>}
    </span>
  );
}

export function UserTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border text-xs text-subtle">
          <tr>
            <th className="px-5 py-3 font-medium">User</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Joined</th>
            <th className="px-5 py-3 font-medium">Last active</th>
            <th className="px-5 py-3 font-medium">2FA</th>
            <th className="px-5 py-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((row) => (
            <tr key={row.id}>
              <td className="max-w-72 px-5 py-3">
                <Link href={`/admin/users/${row.id}`} className="block truncate font-medium hover:text-accent hover:underline">
                  {row.name}
                  {row.id === currentUserId && <span className="ml-2 text-xs font-normal text-subtle">(you)</span>}
                </Link>
                <p className="truncate text-muted">{row.email}</p>
              </td>
              <td className="px-5 py-3">
                <StatusBadges banned={row.banned} emailVerified={row.emailVerified} />
              </td>
              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">{dateFormat.format(new Date(row.createdAt))}</td>
              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">{row.lastActiveAt ? dateFormat.format(new Date(row.lastActiveAt)) : "No session"}</td>
              <td className="px-5 py-3">
                {row.twoFactorEnabled ? <ShieldCheckIcon size={18} weight="fill" className="text-success" aria-label="On" /> : <span className="text-subtle">Off</span>}
              </td>
              <td className="px-5 py-3">
                <RoleSelect userId={row.id} name={row.name} role={row.role} disabled={row.id === currentUserId} />
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-muted">
                No users match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
