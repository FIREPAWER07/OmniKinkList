"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { hasRole, ROLE_LABELS, type Role } from "@/lib/roles";

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Lists", active: pathname === "/admin" || pathname.startsWith("/admin/lists") },
    { href: "/admin/activity", label: "Activity", active: pathname.startsWith("/admin/activity") },
    ...(hasRole(role, "admin") ? [{ href: "/admin/users", label: "Users", active: pathname.startsWith("/admin/users") }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border">
      <nav className="-mb-px flex gap-1" aria-label="Editor sections">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
              link.active ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <span className="mb-3 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
        {ROLE_LABELS[role]}
      </span>
    </div>
  );
}
