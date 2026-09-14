"use client";

import Link from "next/link";
import { useHref, useT } from "@/i18n/client";
import { AccountMenu } from "./account-menu";
import { ProfileSwitcher } from "./kinks/profile-switcher";
import { Logo } from "./logo";
import { PreferencesMenu } from "./preferences-menu";

export function SiteHeader() {
  const t = useT();
  const href = useHref();
  const links = [
    { path: "/#lists", label: t("nav.lists") },
    { path: "/compare", label: t("nav.compare") },
    { path: "/import", label: t("nav.import") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[120rem] items-center gap-4 px-4 lg:px-8">
        <Link href={href("/")} className="shrink-0 rounded-lg" aria-label={t("nav.home")}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.path} href={href(link.path)} className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-fg">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ProfileSwitcher />
          <PreferencesMenu />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
