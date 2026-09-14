import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { UserTable } from "@/components/admin/user-table";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { getUserStats, searchUsers, USER_FILTERS, USERS_PAGE_SIZE, type UserFilter } from "@/lib/admin/queries";
import { cn } from "@/lib/cn";
import { isBanActive } from "@/lib/moderation";
import { requirePageRole } from "@/lib/session";

const FILTER_LABELS: Record<UserFilter, string> = {
  all: "All accounts",
  new: "Joined this week",
  staff: "Editors and admins",
  banned: "Banned",
  unverified: "Email not confirmed",
};

function usersHref({ q, filter, page }: { q: string; filter: UserFilter; page?: number }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (filter !== "all") params.set("filter", filter);
  if (page && page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

export default function UsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: Pick<PageProps<"/[locale]/admin/users">, "searchParams">) {
  const me = await requirePageRole("admin", "/admin/users");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const filter = USER_FILTERS.find((f) => f === params.filter) ?? "all";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const [stats, { rows, total }] = await Promise.all([getUserStats(), searchUsers({ query: q, filter, page })]);
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * USERS_PAGE_SIZE + 1;

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Check accounts, give people the editor role, and ban accounts that break the rules. Editors can change and publish every list; admins can also create or
        delete lists and manage users. Editors must turn on two-factor authentication before they can edit.
      </p>

      <nav aria-label="Filter users" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {USER_FILTERS.map((option) => (
          <Link
            key={option}
            href={usersHref({ q, filter: option })}
            aria-current={option === filter ? "page" : undefined}
            className={cn(
              "rounded-xl border bg-surface px-4 py-3 transition-colors",
              option === filter ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-border-strong",
            )}
          >
            <span className="block font-mono text-2xl font-semibold tabular-nums">{stats[option]}</span>
            <span className={cn("text-sm", option === "banned" && stats.banned > 0 ? "text-danger" : "text-muted")}>{FILTER_LABELS[option]}</span>
          </Link>
        ))}
      </nav>

      <Form action="/admin/users" className="mt-6 flex flex-wrap items-center gap-2">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <Input type="search" name="q" defaultValue={q} placeholder="Name, email, or user id" aria-label="Search users" className="max-w-xs" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q && (
          <Link href={usersHref({ q: "", filter })} className={buttonClass("ghost")}>
            Clear
          </Link>
        )}
      </Form>

      <p className="mb-3 mt-6 text-sm text-muted">
        {total === 0 ? "No accounts" : `${first}–${first + rows.length - 1} of ${total}`}
        {filter !== "all" && ` · ${FILTER_LABELS[filter].toLowerCase()}`}
        {q && ` · matching “${q}”`}
      </p>
      <UserTable
        currentUserId={me.id}
        users={rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: u.emailVerified,
          role: u.role,
          twoFactorEnabled: !!u.twoFactorEnabled,
          banned: isBanActive(u),
          createdAt: u.createdAt.toISOString(),
          lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
        }))}
      />

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4 text-sm">
          {page > 1 ? (
            <Link href={usersHref({ q, filter, page: page - 1 })} className={buttonClass("secondary", "sm")}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={usersHref({ q, filter, page: page + 1 })} className={buttonClass("secondary", "sm")}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
