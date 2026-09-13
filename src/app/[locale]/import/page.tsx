import type { Metadata } from "next";
import { ImportView } from "@/components/kinks/import-view";
import { getLocale, getT } from "@/i18n/server";
import { getPublishedLists } from "@/lib/kinks/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("import.title") };
}

export default async function ImportPage() {
  const lists = await getPublishedLists(await getLocale());
  return <ImportView lists={lists} />;
}
