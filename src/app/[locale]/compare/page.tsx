import type { Metadata } from "next";
import { CompareView } from "@/components/kinks/compare-view";
import { getLocale, getT } from "@/i18n/server";
import { getPublishedLists } from "@/lib/kinks/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("compare.title"), description: t("compare.subtitle") };
}

export default async function ComparePage() {
  const lists = await getPublishedLists(await getLocale());
  return <CompareView lists={lists} />;
}
