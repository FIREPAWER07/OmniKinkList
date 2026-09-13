import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RatingView } from "@/components/kinks/rating-view";
import { getList, getListSummaries } from "@/lib/kinks/data";

export async function generateStaticParams() {
  const lists = await getListSummaries();
  return lists.map((list) => ({ slug: list.slug }));
}

export async function generateMetadata({ params }: PageProps<"/list/[slug]">): Promise<Metadata> {
  const list = await getList((await params).slug);
  return { title: list ? `${list.name} list` : "List not found" };
}

export default async function ListPage({ params }: PageProps<"/list/[slug]">) {
  const list = await getList((await params).slug);
  if (!list) notFound();
  return <RatingView list={list} />;
}
