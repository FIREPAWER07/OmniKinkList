"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { answersStore } from "@/lib/kinks/answers-store";
import { computeStats, listChoices, pruneAnswers } from "@/lib/kinks/choices";
import { decodeShare } from "@/lib/kinks/share";
import type { KinkList } from "@/lib/kinks/types";
import { AnswerSummary } from "./answer-summary";

function subscribeHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}

export function SharedView({ lists }: { lists: KinkList[] }) {
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const [confirmSave, setConfirmSave] = useState(false);

  const decoded = useMemo(() => (hash ? decodeShare(hash) : null), [hash]);
  const list = decoded ? lists.find((l) => l.slug === decoded.slug) : undefined;
  const answers = useMemo(() => (list && decoded ? pruneAnswers(list, decoded.answers) : {}), [list, decoded]);
  const stats = list ? computeStats(listChoices(list), answers) : null;

  if (hash === null) {
    return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 pt-10 lg:px-8" aria-busy="true" />;
  }

  if (!decoded || !list || !stats) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">This link does not work</h1>
        <p className="mt-3 text-muted">
          It may be incomplete or made for a list that no longer exists. Ask for a new link, or make your own list.
        </p>
        <Link href="/#lists" className={buttonClass("primary", "md", "mt-8")}>
          Make your own
        </Link>
      </div>
    );
  }

  const save = () => {
    answersStore.replace(list.slug, answers);
    toast.success(`Saved to your ${list.name} list`);
    router.push(`/list/${list.slug}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-accent">Shared with you</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{list.name} list results</h1>
          <p className="mt-2 text-muted">
            {stats.answered} of {stats.total} answered ({stats.percent}%)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => (Object.keys(answersStore.get(list.slug)).length > 0 ? setConfirmSave(true) : save())}
          >
            Save to my browser
          </Button>
          <Link href={`/list/${list.slug}`} className={buttonClass("primary")}>
            Make your own
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <AnswerSummary list={list} answers={answers} />
      </div>

      <Dialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Replace your answers?"
        description={`You already have answers for the ${list.name} list in this browser. Saving this link replaces them.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmSave(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={save}>
            Replace my answers
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
