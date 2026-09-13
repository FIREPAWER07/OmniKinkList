import type { Metadata } from "next";
import { SuggestForm } from "@/components/suggest-form";
import { getLocale, getT } from "@/i18n/server";
import { getPublishedLists } from "@/lib/kinks/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("suggest.title"), description: t("suggest.subtitle") };
}

export default async function SuggestPage() {
  const lists = await getPublishedLists(await getLocale());
  return (
    <SuggestForm lists={lists.map((l) => ({ slug: l.slug, name: l.name, categories: l.categories.map((c) => ({ id: c.id, name: c.name })) }))} />
  );
}
