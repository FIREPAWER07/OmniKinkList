"use client";

import { ArrowLeftIcon, DownloadSimpleIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { answersStore, useAnswers } from "@/lib/kinks/answers-store";
import { computeStats, listChoices, pruneAnswers } from "@/lib/kinks/choices";
import { downloadExport } from "@/lib/kinks/export-html";
import type { KinkList } from "@/lib/kinks/types";
import { AnswerSummary } from "./answer-summary";
import { ShareDialog } from "./share-dialog";

export function ResultsView({ list }: { list: KinkList }) {
  const { answers: stored } = useAnswers(list.slug);
  const answers = useMemo(() => pruneAnswers(list, stored), [list, stored]);
  const stats = useMemo(() => computeStats(listChoices(list), answers), [list, answers]);
  const [sharing, setSharing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 lg:px-8">
      <Link href={`/list/${list.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon size={14} /> Back to answering
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Your {list.name} results</h1>
          <p className="mt-2 text-muted">
            {stats.answered} of {stats.total} answered ({stats.percent}%)
          </p>
        </div>
        {stats.answered > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              Start over
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                downloadExport(list, answers, window.location.origin);
                toast.success("Export downloaded");
              }}
            >
              <DownloadSimpleIcon size={16} /> Export HTML
            </Button>
            <Button variant="primary" onClick={() => setSharing(true)}>
              <ShareNetworkIcon size={16} /> Share link
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        {stats.answered === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-lg font-medium">No answers yet</p>
            <p className="mt-2 text-muted">Answer a few items and your overview will show up here.</p>
            <Link href={`/list/${list.slug}`} className={buttonClass("primary", "md", "mt-6")}>
              Start answering
            </Link>
          </div>
        ) : (
          <AnswerSummary list={list} answers={answers} />
        )}
      </div>

      <ShareDialog open={sharing} onClose={() => setSharing(false)} list={list} answers={answers} />
      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Start over?"
        description="This deletes every answer for this list from your browser. Export first if you want to keep a copy."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              answersStore.clear(list.slug);
              setConfirmClear(false);
            }}
          >
            Delete answers
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
