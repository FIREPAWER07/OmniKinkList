"use client";

import { CheckIcon, EyeSlashIcon, GlobeIcon, LinkSimpleIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { useHref, useT } from "@/i18n/client";

/** Shown to the owner on their own profile page: who can see it, and shortcuts to edit or share it. */
export function ProfileOwnerBar({ profilePublic }: { profilePublic: boolean }) {
  const t = useT();
  const href = useHref();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success(t("userProfile.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  return (
    <div role="status" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 pl-4 text-sm">
      <p className="flex items-center gap-2 text-muted">
        {profilePublic ? <GlobeIcon size={16} className="shrink-0 text-accent" aria-hidden /> : <EyeSlashIcon size={16} className="shrink-0" aria-hidden />}
        {profilePublic ? t("userProfile.public") : t("userProfile.private")}
      </p>
      <div className="flex gap-2">
        {profilePublic && (
          <Button size="sm" onClick={copy}>
            {copied ? <CheckIcon size={14} aria-hidden /> : <LinkSimpleIcon size={14} aria-hidden />} {t("userProfile.copyLink")}
          </Button>
        )}
        <Link href={`${href("/account")}#profile`} className={buttonClass("secondary", "sm")}>
          <PencilSimpleIcon size={14} aria-hidden /> {t("userProfile.edit")}
        </Link>
      </div>
    </div>
  );
}
