"use client";

import Link from "next/link";
import { useHref, useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { SITE_CONTAINER } from "./site-header";

export function SiteFooter() {
  const t = useT();
  const href = useHref();
  const internal = [
    { path: "/#lists", label: t("nav.lists") },
    { path: "/compare", label: t("nav.compare") },
    { path: "/import", label: t("nav.import") },
    { path: "/suggest", label: t("nav.suggest") },
    { path: "/changelog", label: t("nav.changelog") },
  ];
  return (
    <footer className="mt-24 border-t border-border">
      <div className={cn(SITE_CONTAINER, "grid gap-8 py-10 text-sm md:grid-cols-[1fr_auto]")}>
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-sm text-muted">{t("footer.about")}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-muted sm:grid-cols-3" aria-label={t("footer.links")}>
          {internal.map((link) => (
            <Link key={link.path} href={href(link.path)} className="hover:text-fg">
              {link.label}
            </Link>
          ))}
          <a href="https://github.com/FIREPAWER07/OmniKinkList" className="hover:text-fg">
            GitHub
          </a>
          <a href="https://github.com/FIREPAWER07/OmniKinkList/issues" className="hover:text-fg">
            {t("footer.issues")}
          </a>
          <a href="https://ko-fi.com/D1D31CKA7D" className="hover:text-fg">
            {t("footer.kofi")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
