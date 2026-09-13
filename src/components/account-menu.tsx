"use client";

import { PencilSimpleIcon, SignOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { hasRole, ROLE_LABELS, asRole } from "@/lib/roles";

/** Only visible when signed in. Regular visitors never need an account. */
export function AccountMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session) return null;
  const role = asRole(session.user.role);
  const initial = (session.user.name || session.user.email).charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-9 place-items-center rounded-full border border-border bg-surface-2 text-sm font-semibold hover:border-border-strong"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-60 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/20"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted">{session.user.email}</p>
            <p className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              {ROLE_LABELS[role]}
            </p>
          </div>
          <div className="my-1 h-px bg-border" />
          {hasRole(role, "trusted") && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
            >
              <PencilSimpleIcon size={16} /> Edit content
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await signOut();
              setOpen(false);
              router.refresh();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
          >
            <SignOutIcon size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
