"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { downloadFile, exportFileName } from "@/lib/kinks/export-html";
import { renderSummaryImage } from "@/lib/kinks/summary-image";
import { LEVELS, type KinkList, type Level, type ListData } from "@/lib/kinks/types";

export function ImageDialog({ open, onClose, list, data }: { open: boolean; onClose: () => void; list: KinkList; data: ListData }) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} title={t("image.title")} description={t("image.description")} className="max-w-xl">
      <ImageForm list={list} data={data} />
    </Dialog>
  );
}

function ImageForm({ list, data }: { list: KinkList; data: ListData }) {
  const t = useT();
  const [name, setName] = useState("");
  const [showFavorites, setShowFavorites] = useState(true);
  const [showLimits, setShowLimits] = useState(false);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    const answered = Object.keys(data.answers).length;
    renderSummaryImage(list, data, {
      title: name.trim() ? t("image.titleNamed", { name: name.trim(), list: list.name }) : t("image.titleMine", { list: list.name }),
      subtitle: t("image.subtitle", { count: answered }),
      favoritesTitle: t("levels.favorite"),
      limitsTitle: t("levels.limit"),
      footer: t("image.footer", { url: window.location.host }),
      customCategory: t("custom.category"),
      levelLabels: Object.fromEntries(LEVELS.map((l) => [l, t(`levels.${l}`)])) as Record<Level, string>,
      showFavorites,
      showLimits,
    }).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setPreview({ url, blob });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [list, data, name, showFavorites, showLimits, t]);

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
      <div className="grid content-start gap-4">
        <Field label={t("image.name")} htmlFor="image-name" hint={t("image.nameHint")}>
          <Input id="image-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="off" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showFavorites} onChange={(e) => setShowFavorites(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          {t("image.showFavorites")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showLimits} onChange={(e) => setShowLimits(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          {t("image.showLimits")}
        </label>
        <Button variant="primary" disabled={!preview} onClick={() => preview && downloadFile(preview.blob, exportFileName(list, "png"), "image/png")}>
          <DownloadSimpleIcon size={16} /> {t("image.download")}
        </Button>
      </div>
      <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview.url} alt={t("image.previewAlt")} className="size-full object-cover" />}
      </div>
    </div>
  );
}
