import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/kinks/results-view";
import { getList, getListSummaries } from "@/lib/kinks/data";

export async function generateStaticParams() {
  const lists = await getListSummaries();
  return lists.map((list) => ({ slug: list.slug }));
}

export const metadata: Metadata = { title: "Your results", robots: { index: false } };

export default async function ResultsPage({ params }: PageProps<"/list/[slug]/results">) {
  const list = await getList((await params).slug);
  if (!list) notFound();
  return <ResultsView list={list} />;
}
