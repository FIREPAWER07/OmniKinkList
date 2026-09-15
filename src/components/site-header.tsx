"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LOCALES } from "@/i18n/config";
import { useHref, useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { AccountMenu } from "./account-menu";
import { ProfileSwitcher } from "./kinks/profile-switcher";
import { Logo } from "./logo";
import { PreferencesMenu } from "./preferences-menu";

/**
 * The header and footer share the content width of regular pages (max-w-7xl), so the logo lines up with
 * page titles. Pages that need the full width (the rating view) mark themselves with `data-layout="wide"`.
 */
export const SITE_CONTAINER = "mx-auto max-w-7xl px-4 lg:px-8 [body:has([data-layout=wide])_&]:max-w-[120rem]";

const LOCALE_PREFIX = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);

type NavLink = { path: string; label: string; match: string };

export function SiteHeader() {
  const t = useT();
  const href = useHref();
  const links: NavLink[] = [
    { path: "/#lists", label: t("nav.lists"), match: "/list" },
    { path: "/compare", label: t("nav.compare"), match: "/compare" },
    { path: "/import", label: t("nav.import"), match: "/import" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className={cn(SITE_CONTAINER, "flex h-14 items-center gap-4")}>
        <Link href={href("/")} className="shrink-0 rounded-lg" aria-label={t("nav.home")}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {/* The active link needs the pathname, which is only known at request time on some routes. */}
          <Suspense fallback={<NavLinks links={links} active={null} />}>
            <ActiveNavLinks links={links} />
          </Suspense>
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

function ActiveNavLinks({ links }: { links: NavLink[] }) {
  // Unprefixed English URLs are rewritten to /en internally, so strip any locale before matching.
  const path = usePathname().replace(LOCALE_PREFIX, "") || "/";
  const active = links.find((link) => path === link.match || path.startsWith(`${link.match}/`)) ?? null;
  return <NavLinks links={links} active={active?.path ?? null} />;
}

function NavLinks({ links, active }: { links: NavLink[]; active: string | null }) {
  const href = useHref();
  return links.map((link) => (
    <Link
      key={link.path}
      href={href(link.path)}
      aria-current={active === link.path ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-1.5 transition-colors",
        active === link.path ? "bg-surface-2 font-medium text-fg" : "text-muted hover:text-fg",
      )}
    >
      {link.label}
    </Link>
  ));
}
