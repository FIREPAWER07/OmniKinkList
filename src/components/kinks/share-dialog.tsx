"use client";

import { CheckIcon, CopyIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/config";
import { shareUrl } from "@/lib/kinks/share";
import type { KinkList, ListData } from "@/lib/kinks/types";

export function ShareDialog({ open, onClose, list, data }: { open: boolean; onClose: () => void; list: KinkList; data: ListData }) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} title={t("share.title")} description={t("share.description")}>
      <ShareForm list={list} data={data} />
    </Dialog>
  );
}

function ShareForm({ list, data }: { list: KinkList; data: ListData }) {
  const t = useT();
  const locale = useLocale();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const hasNotes = Object.keys(data.notes).length > 0;
  const prefix = localePath(locale, "/").replace(/\/$/, "");
  const url = shareUrl(window.location.origin, prefix, list.slug, data, { includeNotes, name });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  return (
    <div className="grid gap-4">
      <Field label={t("share.nameLabel")} htmlFor="share-name" hint={t("share.nameHint")}>
        <Input id="share-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" />
      </Field>
      {hasNotes && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          {t("share.includeNotes")}
        </label>
      )}
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={t("share.link")}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 font-mono text-xs text-muted"
        />
        <Button variant="primary" onClick={copy}>
          {copied ? <CheckIcon size={16} weight="bold" /> : <CopyIcon size={16} />}
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
      </div>
      <p className="flex gap-2 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        <WarningIcon size={16} className="mt-px shrink-0 text-maybe" aria-hidden />
        {t("share.warning")}
      </p>
    </div>
  );
}
