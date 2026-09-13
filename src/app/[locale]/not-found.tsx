"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useHref, useT } from "@/i18n/client";

export default function NotFound() {
  const t = useT();
  const href = useHref();
  return (
    <div className="mx-auto max-w-lg px-4 pt-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("notFound.title")}</h1>
      <p className="mt-3 text-muted">{t("notFound.body")}</p>
      <Link href={href("/")} className={buttonClass("primary", "md", "mt-8")}>
        {t("notFound.home")}
      </Link>
    </div>
  );
}
