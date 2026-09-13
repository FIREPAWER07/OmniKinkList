import type { Metadata } from "next";
import { SharedView } from "@/components/kinks/shared-view";
import { getLocale, getT } from "@/i18n/server";
import { getPublishedLists } from "@/lib/kinks/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("shared.metaTitle"), robots: { index: false, follow: false } };
}

export default async function SharedPage() {
  const lists = await getPublishedLists(await getLocale());
  return <SharedView lists={lists} />;
}
