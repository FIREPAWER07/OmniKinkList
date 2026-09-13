"use client";

import { ConfettiIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHref, useT } from "@/i18n/client";

const PIECES = 36;

/** Shows once when the last choice of a list gets answered during this visit. */
export function Celebration({ slug, complete }: { slug: string; complete: boolean }) {
  const t = useT();
  const href = useHref();
  const [open, setOpen] = useState(false);
  const wasComplete = useRef<boolean | null>(null);

  useEffect(() => {
    // The first value is what the page loaded with; only a change to complete celebrates.
    if (wasComplete.current === false && complete) setOpen(true);
    wasComplete.current = complete;
  }, [complete]);

  return (
    <>
      {open && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden">
          {Array.from({ length: PIECES }, (_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 97) % 100}%`,
                animationDelay: `${(i % 12) * 60}ms`,
                background: ["var(--accent)", "var(--lv-like)", "var(--lv-maybe)", "var(--lv-favorite)"][i % 4],
                transform: `rotate(${i * 37}deg)`,
              }}
            />
          ))}
        </div>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={t("celebration.title")} description={t("celebration.body")}>
        <div className="flex flex-col items-center gap-5">
          <ConfettiIcon size={48} className="text-accent" weight="duotone" aria-hidden />
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost")}>
              {t("celebration.stay")}
            </button>
            <Link href={href(`/list/${slug}/results`)} className={buttonClass("primary")}>
              {t("celebration.results")}
            </Link>
          </div>
        </div>
      </Dialog>
    </>
  );
}
