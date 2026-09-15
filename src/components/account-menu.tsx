"use client";

import { CloudCheckIcon, GearIcon, PencilSimpleIcon, SignInIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { useHref, useT } from "@/i18n/client";
import { signOut, useSession } from "@/lib/auth-client";
import { asRole, hasRole } from "@/lib/roles";
import { useSync } from "@/lib/sync/sync-provider";

export function AccountMenu() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const sync = useSync();

  if (isPending) return <span className="size-9" />;
  if (!session) {
    return (
      <Link
        href={href("/login")}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg max-sm:size-9 max-sm:justify-center max-sm:px-0"
        aria-label={t("nav.signIn")}
      >
        <SignInIcon size={18} aria-hidden />
        <span className="max-sm:hidden">{t("nav.signIn")}</span>
      </Link>
    );
  }

  const role = asRole(session.user.role);
  const initial = (session.user.name || session.user.email).charAt(0).toUpperCase();

  return (
    <Menu
      label={t("nav.account")}
      trigger={
        <MenuButton className="size-9 rounded-full border border-border bg-surface-2 text-sm font-semibold text-fg" aria-label={t("nav.account")}>
          {initial}
        </MenuButton>
      }
    >
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium">{session.user.name}</p>
        <p className="truncate text-xs text-muted">{session.user.email}</p>
        {sync.status === "on" && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-success">
            <CloudCheckIcon size={13} aria-hidden /> {t("sync.menuOn")}
          </p>
        )}
      </div>
      <MenuSeparator />
      {session.user.username && (
        <MenuItem onSelect={() => router.push(href(`/u/${session.user.username}`))}>
          <UserCircleIcon size={16} aria-hidden /> {t("nav.profile")}
        </MenuItem>
      )}
      <MenuItem onSelect={() => router.push(href("/account"))}>
        <GearIcon size={16} aria-hidden /> {t("nav.account")}
      </MenuItem>
      {hasRole(role, "trusted") && (
        <MenuItem onSelect={() => router.push("/admin")}>
          <PencilSimpleIcon size={16} aria-hidden /> {t("nav.editor")}
        </MenuItem>
      )}
      <MenuItem
        onSelect={async () => {
          await sync.forgetDevice();
          await signOut();
          router.refresh();
        }}
      >
        <SignOutIcon size={16} aria-hidden /> {t("nav.signOut")}
      </MenuItem>
    </Menu>
  );
}
