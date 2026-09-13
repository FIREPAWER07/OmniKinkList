import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/kinks/results-view";
import { getLocale, getT } from "@/i18n/server";
import { getList, getPublishedLists } from "@/lib/kinks/data";

export async function generateStaticParams() {
  const lists = await getPublishedLists("en");
  return lists.map((list) => ({ slug: list.slug }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("results.metaTitle"), robots: { index: false } };
}

export default async function ResultsPage({ params }: PageProps<"/[locale]/list/[slug]/results">) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const list = await getList(slug, locale);
  if (!list) notFound();
  return <ResultsView list={list} />;
}
