"use client";

import { CheckIcon, CopyIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { shareUrl } from "@/lib/kinks/share";
import type { Answers, KinkList } from "@/lib/kinks/types";

export function ShareDialog({
  open,
  onClose,
  list,
  answers,
}: {
  open: boolean;
  onClose: () => void;
  list: KinkList;
  answers: Answers;
}) {
  const [copied, setCopied] = useState(false);
  const url = open ? shareUrl(window.location.origin, list.slug, answers) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share your answers" description="Anyone with this link can see your answers.">
      <div className="grid gap-4">
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Share link"
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 font-mono text-xs text-muted"
          />
          <Button variant="primary" onClick={copy}>
            {copied ? <CheckIcon size={16} weight="bold" /> : <CopyIcon size={16} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="flex gap-2 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
          <WarningIcon size={16} className="mt-px shrink-0 text-maybe" aria-hidden />
          The answers are stored inside the link, after the # sign, so they are never sent to our server. The link
          does not update if you change your answers later.
        </p>
      </div>
    </Dialog>
  );
}
