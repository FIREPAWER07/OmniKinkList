"use client";

import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHref, useT } from "@/i18n/client";
import { allChoices, computeStats, pruneKeys, withCustom } from "@/lib/kinks/choices";
import { isEmptyListData } from "@/lib/kinks/list-data";
import { decodeShare } from "@/lib/kinks/share";
import { listStore, profileStore } from "@/lib/kinks/store";
import type { KinkList, ListData } from "@/lib/kinks/types";
import { AnswerSummary } from "./answer-summary";

function subscribeHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}

export function SharedView({ lists }: { lists: KinkList[] }) {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const [confirm, setConfirm] = useState(false);

  const decoded = useMemo(() => (hash ? decodeShare(hash) : null), [hash]);
  const list = decoded ? lists.find((l) => l.slug === decoded.slug) : undefined;
  const data = useMemo<ListData | null>(() => {
    if (!list || !decoded) return null;
    const categories = withCustom(list, decoded.data.custom, "");
    return { ...decoded.data, answers: pruneKeys(categories, decoded.data.answers), experience: pruneKeys(categories, decoded.data.experience) };
  }, [list, decoded]);

  if (hash === null) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 pt-10 lg:px-8" aria-busy="true" />;

  if (!decoded || !list || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("shared.brokenTitle")}</h1>
        <p className="mt-3 text-muted">{t("shared.brokenBody")}</p>
        <Link href={href("/#lists")} className={buttonClass("primary", "md", "mt-8")}>
          {t("shared.makeOwn")}
        </Link>
      </div>
    );
  }

  const stats = computeStats(allChoices(withCustom(list, data.custom, "")), data.answers);

  const saveAsProfile = () => {
    const profile = profileStore.create(decoded.name || t("profiles.shared"));
    listStore.replace(list.slug, data, profile.id);
    toast.success(t("shared.savedProfile", { name: profile.name }));
    router.push(href(`/list/${list.slug}/results`));
  };

  const replaceMine = () => {
    listStore.replace(list.slug, data);
    toast.success(t("shared.saved", { name: list.name }));
    router.push(href(`/list/${list.slug}`));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-accent">{decoded.name ? t("shared.fromNamed", { name: decoded.name }) : t("shared.badge")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{t("shared.title", { name: list.name })}</h1>
          <p className="mt-2 text-muted">{t("results.summary", { answered: stats.answered, total: stats.total, percent: stats.percent })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${href("/compare")}?list=${list.slug}`} className={buttonClass("secondary")}>
            <ArrowsLeftRightIcon size={16} /> {t("shared.compare")}
          </Link>
          <Button onClick={() => setConfirm(true)}>{t("shared.save")}</Button>
          <Link href={href(`/list/${list.slug}`)} className={buttonClass("primary")}>
            {t("shared.makeOwn")}
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <AnswerSummary list={list} data={data} />
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={t("shared.saveTitle")} description={t("shared.saveBody")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={isEmptyListData(listStore.get(list.slug)) ? "secondary" : "danger"}
            onClick={replaceMine}
          >
            {t("shared.replaceMine")}
          </Button>
          <Button variant="primary" onClick={saveAsProfile}>
            {t("shared.saveAsProfile")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
