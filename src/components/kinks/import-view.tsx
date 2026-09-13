"use client";

import { FileHtmlIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { answersStore, useAnswers } from "@/lib/kinks/answers-store";
import { matchImport, parseHtmlExport, parseLegacyJson, type ImportSource } from "@/lib/kinks/import";
import { decodeShareInput } from "@/lib/kinks/share";
import type { KinkList } from "@/lib/kinks/types";

const KIND_LABELS: Record<ImportSource["kind"], string> = {
  "v2-html": "OmniKinkList export",
  "v1-html": "Export from the old site",
  "v1-json": "Saved data from the old site",
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ImportView({ lists }: { lists: KinkList[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [slug, setSlug] = useState(lists[0]?.slug ?? "");

  const list = lists.find((l) => l.slug === slug);
  const result = useMemo(() => (source && list ? matchImport(list, source) : null), [source, list]);
  const { answers: current } = useAnswers(slug);
  const existing = Object.keys(current).length;

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

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return accept(null, "That file is too large to be an OmniKinkList export.");
    const content = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".json") ? parseLegacyJson(content) : parseHtmlExport(content);
    accept(parsed, "We could not find any answers in that file. Is it an OmniKinkList export?");
  };

  const readText = () => {
    const value = text.trim();
    if (!value) return;
    const shared = decodeShareInput(value);
    if (shared) {
      accept(
        { kind: "v2-html", listSlug: shared.slug, exportedAt: null, answers: shared.answers, entries: [] },
        "",
      );
      return;
    }
    accept(parseLegacyJson(value), "That is not a share link or saved answers we recognize.");
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    readFile(event.dataTransfer.files[0]);
  };

  const apply = (mode: "replace" | "merge") => {
    if (!list || !result) return;
    const next = mode === "merge" ? { ...current, ...result.answers } : result.answers;
    answersStore.replace(list.slug, next);
    toast.success(`Imported ${result.matched} answers into the ${list.name} list`);
    router.push(`/list/${list.slug}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Import answers</h1>
      <p className="mt-2 max-w-xl text-muted">
        Continue from an exported HTML file, a share link, or saved data from the old OmniKinkList site. Everything is
        read in your browser.
      </p>

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
          <p className="mt-3 font-medium">Drop your export here, or click to choose a file</p>
          <p className="mt-1 text-sm text-muted">HTML exports from the new or old site, or a saved .json file</p>
          <input
            ref={fileInput}
            type="file"
            accept=".html,.htm,.json,text/html,application/json"
            className="hidden"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <Field
            label="Or paste a share link or saved data"
            htmlFor="import-text"
            hint='A link like https://…/s#… or JSON such as {"Kissing_Giving": {"level": "like"}}'
          >
            <Textarea id="import-text" value={text} onChange={(event) => setText(event.target.value)} rows={3} className="font-mono text-xs" />
          </Field>
          <div className="mt-3 flex justify-end">
            <Button onClick={readText} disabled={!text.trim()}>
              Read
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
              <h2 className="font-semibold">{KIND_LABELS[source.kind]}</h2>
              {source.exportedAt && (
                <p className="text-sm text-muted">Exported {new Date(source.exportedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Import into" htmlFor="import-list" hint={source.listSlug ? undefined : "The file does not say which list it is from."}>
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
                <dt className="text-subtle">Matched</dt>
                <dd className="font-mono text-lg tabular-nums">{result.matched}</dd>
              </div>
              <div>
                <dt className="text-subtle">Not found</dt>
                <dd className="font-mono text-lg tabular-nums">{result.unmatched.length}</dd>
              </div>
            </dl>
          </div>

          {result.unmatched.length > 0 && (
            <details className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
              <summary className="cursor-pointer text-muted">
                {result.unmatched.length} answers could not be matched to the {list.name} list
              </summary>
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
            {existing > 0 && (
              <Button onClick={() => apply("merge")} disabled={result.matched === 0}>
                Merge with my {existing} answers
              </Button>
            )}
            <Button variant="primary" onClick={() => apply("replace")} disabled={result.matched === 0}>
              {existing > 0 ? "Replace my answers" : "Import answers"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
