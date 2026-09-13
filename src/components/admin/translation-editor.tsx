"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input, Textarea } from "@/components/ui/field";
import { LOCALE_NAMES, type Locale } from "@/i18n/config";
import { saveTranslation } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";
import type { PublishedData } from "@/lib/kinks/published";

interface Row {
  entityKey: string;
  field: "name" | "tagline" | "description" | "label";
  source: string;
  context: string;
  multiline?: boolean;
}

/** Side-by-side English source and translation for every text in the list. Saves on blur. */
export function TranslationEditor({ draft, locale }: { draft: PublishedData; locale: Exclude<Locale, "en"> }) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [query, setQuery] = useState("");
  const saved = draft.translations[locale] ?? {};

  const rows = useMemo(() => {
    const all: Row[] = [
      { entityKey: `l:${draft.slug}`, field: "name", source: draft.name, context: "List name" },
      { entityKey: `l:${draft.slug}`, field: "tagline", source: draft.tagline, context: "List tagline" },
      { entityKey: `l:${draft.slug}`, field: "description", source: draft.description, context: "List description", multiline: true },
    ];
    for (const category of draft.categories) {
      all.push({ entityKey: `c:${category.id}`, field: "name", source: category.name, context: "Category" });
      all.push({ entityKey: `c:${category.id}`, field: "description", source: category.description, context: `${category.name} description`, multiline: true });
      for (const item of category.items) {
        all.push({ entityKey: `i:${item.id}`, field: "name", source: item.name, context: category.name });
        all.push({ entityKey: `i:${item.id}`, field: "description", source: item.description, context: `${item.name} description`, multiline: true });
        for (const option of item.options) {
          all.push({ entityKey: `o:${option.id}`, field: "label", source: option.label, context: `${item.name} ${option.kind === "role" ? "role" : "variation"}` });
        }
      }
    }
    return all.filter((row) => row.source.trim());
  }, [draft]);

  const translatedCount = rows.filter((row) => saved[row.entityKey]?.[row.field]).length;
  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (row) => (!onlyMissing || !saved[row.entityKey]?.[row.field]) && (!q || row.source.toLowerCase().includes(q) || row.context.toLowerCase().includes(q)),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {LOCALE_NAMES[locale]}: {translatedCount} of {rows.length} texts translated. Missing ones show in English. Publish to make translations live.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter" aria-label="Filter texts" className="h-9 w-48" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Only missing
          </label>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-accent" style={{ width: `${rows.length ? (translatedCount / rows.length) * 100 : 0}%` }} />
      </div>
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
        {visible.slice(0, 400).map((row) => (
          <TranslationRow key={`${row.entityKey}-${row.field}`} row={row} listSlug={draft.slug} locale={locale} value={saved[row.entityKey]?.[row.field] ?? ""} />
        ))}
      </ul>
      {visible.length > 400 && <p className="mt-3 text-sm text-muted">Showing the first 400. Use the filter to find the rest.</p>}
    </div>
  );
}

function TranslationRow({ row, listSlug, locale, value }: { row: Row; listSlug: string; locale: Locale; value: string }) {
  const [text, setText] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const save = async () => {
    if (text === value) return;
    setState("saving");
    const result = await saveTranslation({ listSlug, locale, entityKey: row.entityKey, field: row.field, value: text });
    if (result.ok) {
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } else {
      setState("idle");
      toast.error(result.error);
    }
  };

  const Control = row.multiline ? Textarea : Input;
  return (
    <li className="grid gap-2 px-4 py-3 md:grid-cols-2 md:gap-6">
      <div className="min-w-0">
        <p className="text-xs text-subtle">{row.context}</p>
        <p className="mt-0.5 text-sm">{row.source}</p>
      </div>
      <div className="relative">
        <Control
          value={text}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setText(e.target.value)}
          onBlur={save}
          lang={locale}
          aria-label={`${LOCALE_NAMES[locale]} translation of ${row.source}`}
          rows={row.multiline ? 2 : undefined}
          maxLength={300}
          className={cn(row.multiline ? "min-h-16" : "h-9", !text && "border-dashed")}
        />
        {state !== "idle" && <span className="absolute -top-4 right-0 text-xs text-subtle">{state === "saving" ? "Saving" : "Saved"}</span>}
      </div>
    </li>
  );
}
