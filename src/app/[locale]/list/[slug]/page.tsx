import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RatingView } from "@/components/kinks/rating-view";
import { getLocale, getT } from "@/i18n/server";
import { getList, getPublishedLists } from "@/lib/kinks/data";

export async function generateStaticParams() {
  const lists = await getPublishedLists("en");
  return lists.map((list) => ({ slug: list.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/list/[slug]">): Promise<Metadata> {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getT()]);
  const list = await getList(slug, locale);
  return { title: list ? t("rating.title", { name: list.name }) : t("notFound.title"), description: list?.description };
}

export default async function ListPage({ params }: PageProps<"/[locale]/list/[slug]">) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const list = await getList(slug, locale);
  if (!list) notFound();
  return <RatingView list={list} />;
}
