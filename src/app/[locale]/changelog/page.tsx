import type { Metadata } from "next";
import Link from "next/link";
import { localePath } from "@/i18n/config";
import { getLocale, getT, getTranslator } from "@/i18n/server";
import { getChangelog } from "@/lib/kinks/data";
import type { ListChanges } from "@/lib/kinks/published";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("changelog.title"), description: t("changelog.subtitle") };
}

export default async function ChangelogPage() {
  const locale = await getLocale();
  const t = getTranslator(locale);
  const entries = await getChangelog(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });

  const lines = (changes: ListChanges) => {
    const out: string[] = [];
    const names = (refs: { name: string }[]) => refs.map((r) => r.name).join(", ");
    if (changes.addedCategories.length) out.push(t("changelog.addedCategories", { names: names(changes.addedCategories) }));
    if (changes.addedItems.length) out.push(t("changelog.addedItems", { count: changes.addedItems.length, names: names(changes.addedItems) }));
    if (changes.addedOptions.length) out.push(t("changelog.addedOptions", { count: changes.addedOptions.length }));
    if (changes.renamedItems.length) out.push(t("changelog.renamedItems", { names: changes.renamedItems.map((r) => `${r.from} → ${r.name}`).join(", ") }));
    if (changes.editedItems.length) out.push(t("changelog.editedItems", { count: changes.editedItems.length }));
    if (changes.removedItems.length) out.push(t("changelog.removedItems", { count: changes.removedItems.length, names: names(changes.removedItems) }));
    if (changes.removedOptions.length) out.push(t("changelog.removedOptions", { count: changes.removedOptions.length }));
    if (changes.removedCategories.length) out.push(t("changelog.removedCategories", { names: names(changes.removedCategories) }));
    if (changes.translatedLocales.length) out.push(t("changelog.translations", { locales: changes.translatedLocales.join(", ").toUpperCase() }));
    if (changes.detailsChanged) out.push(t("changelog.details"));
    return out;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("changelog.title")}</h1>
      <p className="mt-2 text-muted">{t("changelog.subtitle")}</p>
      {entries.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted">{t("changelog.empty")}</p>
      ) : (
        <ol className="mt-10 grid gap-4">
          {entries.map((entry) => {
            const details = entry.version === 1 ? [t("changelog.firstVersion")] : lines(entry.changes);
            return (
              <li key={`${entry.listSlug}-${entry.version}`} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    <Link href={localePath(locale, `/list/${entry.listSlug}`)} className="hover:text-accent">
                      {entry.listName}
                    </Link>{" "}
                    <span className="font-mono text-sm font-normal text-subtle">v{entry.version}</span>
                  </h2>
                  <time dateTime={entry.publishedAt} className="text-sm text-subtle">
                    {dateFormat.format(new Date(entry.publishedAt))}
                  </time>
                </div>
                {entry.note && entry.version !== 1 && <p className="mt-2 text-sm">{entry.note}</p>}
                <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-muted">
                  {details.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
