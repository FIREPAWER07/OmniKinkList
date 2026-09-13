"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { hasRole, ROLE_LABELS, type Role } from "@/lib/roles";

export function AdminNav({ role, pendingSuggestions }: { role: Role; pendingSuggestions: number }) {
  const { path } = stripLocale(usePathname());
  const links = [
    { href: "/admin", label: "Lists", active: path === "/admin" || path.startsWith("/admin/lists") },
    { href: "/admin/suggestions", label: "Suggestions", badge: pendingSuggestions, active: path.startsWith("/admin/suggestions") },
    { href: "/admin/activity", label: "Activity", active: path.startsWith("/admin/activity") },
    ...(hasRole(role, "admin") ? [{ href: "/admin/users", label: "Users", active: path.startsWith("/admin/users") }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border">
      <nav className="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]" aria-label="Editor sections">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
              link.active ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {link.label}
            {!!link.badge && <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg">{link.badge}</span>}
          </Link>
        ))}
      </nav>
      <span className="mb-3 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">{ROLE_LABELS[role]}</span>
    </div>
  );
}
