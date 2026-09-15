"use client";

import { ArrowLeftIcon, ArrowsLeftRightIcon, DownloadSimpleIcon, ImageIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHref, useT } from "@/i18n/client";
import { allChoices, computeStats, pruneListData, withCustom } from "@/lib/kinks/choices";
import { downloadFile, exportFileName, generateExportHtml } from "@/lib/kinks/export-html";
import { listStore, useListData } from "@/lib/kinks/store";
import type { KinkList } from "@/lib/kinks/types";
import { AnswerSummary } from "./answer-summary";
import { ImageDialog } from "./image-dialog";
import { ShareDialog } from "./share-dialog";
import { useExportLabels } from "./use-export-labels";

export function ResultsView({ list }: { list: KinkList }) {
  const t = useT();
  const href = useHref();
  const { data: stored } = useListData(list.slug);
  const exportLabels = useExportLabels(list.name);
  const data = useMemo(() => pruneListData(list, stored), [list, stored]);
  const stats = useMemo(() => computeStats(allChoices(withCustom(list, data.custom, "")), data.answers), [list, data]);
  const [dialog, setDialog] = useState<"share" | "image" | "clear" | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 lg:px-8">
      <Link href={href(`/list/${list.slug}`)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon size={14} /> {t("results.back")}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("results.title", { name: list.name })}</h1>
          <p className="mt-2 text-muted">{t("results.summary", { answered: stats.answered, total: stats.total, percent: stats.percent })}</p>
        </div>
        {stats.answered > 0 && (
          // On phones the buttons fill even rows and sharing comes first; "Start over" lives at the bottom of the page.
          <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:grow sm:[&>*]:grow-0">
            <Link href={href(`/compare?list=${list.slug}`)} className={buttonClass("secondary")}>
              <ArrowsLeftRightIcon size={16} /> {t("results.compare")}
            </Link>
            <Button
              onClick={() => {
                downloadFile(generateExportHtml(list, data, window.location.origin, exportLabels), exportFileName(list, "html"), "text/html");
                toast.success(t("results.exported"));
              }}
            >
              <DownloadSimpleIcon size={16} /> {t("results.exportHtml")}
            </Button>
            <Button onClick={() => setDialog("image")}>
              <ImageIcon size={16} /> {t("results.exportImage")}
            </Button>
            <Button variant="primary" className="order-first sm:order-none" onClick={() => setDialog("share")}>
              <ShareNetworkIcon size={16} /> {t("results.share")}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        {stats.answered === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-lg font-medium">{t("results.emptyTitle")}</p>
            <p className="mt-2 text-muted">{t("results.emptyBody")}</p>
            <Link href={href(`/list/${list.slug}`)} className={buttonClass("primary", "md", "mt-6")}>
              {t("results.startAnswering")}
            </Link>
          </div>
        ) : (
          <AnswerSummary list={list} data={data} />
        )}
      </div>

      {stats.answered > 0 && (
        <div className="mt-16 flex justify-center border-t border-border pt-6">
          <Button variant="danger" size="sm" onClick={() => setDialog("clear")}>
            {t("results.startOver")}
          </Button>
        </div>
      )}

      <ShareDialog open={dialog === "share"} onClose={() => setDialog(null)} list={list} data={data} />
      <ImageDialog open={dialog === "image"} onClose={() => setDialog(null)} list={list} data={data} />
      <Dialog open={dialog === "clear"} onClose={() => setDialog(null)} title={t("results.startOverTitle")} description={t("results.startOverBody")}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDialog(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              listStore.clear(list.slug);
              setDialog(null);
            }}
          >
            {t("results.deleteAnswers")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
