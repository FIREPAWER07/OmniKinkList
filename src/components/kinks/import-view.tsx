"use client";

import { FileHtmlIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useHref, useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { matchImport, parseHtmlExport, parseV1Handoff, type ImportSource } from "@/lib/kinks/import";
import { isEmptyListData } from "@/lib/kinks/list-data";
import { decodeShareInput } from "@/lib/kinks/share";
import { listStore, useListData } from "@/lib/kinks/store";
import type { KinkList } from "@/lib/kinks/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ImportView({ lists }: { lists: KinkList[] }) {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [slug, setSlug] = useState(lists[0]?.slug ?? "");

  const list = lists.find((l) => l.slug === slug);
  const result = useMemo(() => (source && list ? matchImport(list, source) : null), [source, list]);
  const { data: current } = useListData(slug);
  const hasCurrent = !isEmptyListData(current);

  const accept = (parsed: ImportSource | null, failure: string) => {
    if (!parsed) {
      setSource(null);
      setError(failure);
      return;
    }
    setError(null);
    setSource(parsed);
    if (parsed.listSlug && lists.some((l) => l.slug === parsed.listSlug)) setSlug(parsed.listSlug);
  };

  // Answers handed over by the redirect on the old site: /import#v1=...
  useEffect(() => {
    const handoff = parseV1Handoff(window.location.hash);
    if (!handoff) return;
    history.replaceState(null, "", window.location.pathname);
    // Reading the URL hash is only possible after mount, so this state update is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource(handoff);
    if (handoff.listSlug && lists.some((l) => l.slug === handoff.listSlug)) setSlug(handoff.listSlug);
  }, [lists]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return accept(null, t("import.errorTooLarge"));
    accept(parseHtmlExport(await file.text()), t("import.errorNotFound"));
  };

  const readLink = () => {
    const shared = decodeShareInput(link);
    accept(
      shared ? { kind: "share", listSlug: shared.slug, exportedAt: null, data: shared.data, entries: [], noteNames: {} } : null,
      t("import.errorBadLink"),
    );
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    readFile(event.dataTransfer.files[0]);
  };

  const apply = (mode: "replace" | "merge") => {
    if (!list || !result) return;
    const next =
      mode === "merge"
        ? {
            ...current,
            answers: { ...current.answers, ...result.data.answers },
            experience: { ...current.experience, ...result.data.experience },
            notes: { ...current.notes, ...result.data.notes },
            custom: [...current.custom, ...result.data.custom.filter((c) => !current.custom.some((own) => own.id === c.id))],
          }
        : result.data;
    listStore.replace(list.slug, next);
    toast.success(t("import.done", { count: result.matched, name: list.name }));
    router.push(href(`/list/${list.slug}`));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("import.title")}</h1>
      <p className="mt-2 max-w-xl text-muted">{t("import.subtitle")}</p>

      <div className="mt-8 grid gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && fileInput.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "grid cursor-pointer place-items-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
            dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface hover:border-accent/60",
          )}
        >
          <UploadSimpleIcon size={28} className="text-accent" aria-hidden />
          <p className="mt-3 font-medium">{t("import.drop")}</p>
          <p className="mt-1 text-sm text-muted">{t("import.dropHint")}</p>
          <input ref={fileInput} type="file" accept=".html,.htm,text/html" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <Field label={t("import.linkLabel")} htmlFor="import-link" hint={t("import.linkHint")}>
            <Input id="import-link" value={link} onChange={(event) => setLink(event.target.value)} className="font-mono text-xs" />
          </Field>
          <div className="mt-3 flex justify-end">
            <Button onClick={readLink} disabled={!link.trim()}>
              {t("import.read")}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </p>
      )}

      {source && result && list && (
        <section className="mt-8 rounded-xl border border-border bg-surface p-5 md:p-6" aria-live="polite">
          <div className="flex items-start gap-3">
            <FileHtmlIcon size={24} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <div>
              <h2 className="font-semibold">{t(`import.kinds.${source.kind}`)}</h2>
              {source.exportedAt && <p className="text-sm text-muted">{t("import.exportedOn", { date: new Date(source.exportedAt).toLocaleDateString() })}</p>}
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label={t("import.into")} htmlFor="import-list" hint={source.listSlug ? undefined : t("import.noListInfo")}>
              <Select id="import-list" value={slug} onChange={(event) => setSlug(event.target.value)}>
                {lists.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <dl className="flex gap-6 text-sm sm:pb-1">
              <div>
                <dt className="text-subtle">{t("import.matched")}</dt>
                <dd className="font-mono text-lg tabular-nums">{result.matched}</dd>
              </div>
              <div>
                <dt className="text-subtle">{t("import.notFound")}</dt>
                <dd className="font-mono text-lg tabular-nums">{result.unmatched.length}</dd>
              </div>
            </dl>
          </div>

          {result.unmatched.length > 0 && (
            <details className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
              <summary className="cursor-pointer text-muted">{t("import.unmatched", { count: result.unmatched.length, name: list.name })}</summary>
              <ul className="mt-2 grid gap-1 text-muted sm:grid-cols-2">
                {result.unmatched.map((entry, index) => (
                  <li key={index}>
                    {entry.itemName}
                    {entry.optionLabel ? ` (${entry.optionLabel})` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {hasCurrent && (
              <Button onClick={() => apply("merge")} disabled={result.matched === 0}>
                {t("import.merge")}
              </Button>
            )}
            <Button variant="primary" onClick={() => apply("replace")} disabled={result.matched === 0 && result.data.custom.length === 0}>
              {hasCurrent ? t("import.replace") : t("import.importButton")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
