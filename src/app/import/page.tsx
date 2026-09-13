import type { Metadata } from "next";
import { ImportView } from "@/components/kinks/import-view";
import { getAllLists } from "@/lib/kinks/data";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const lists = await getAllLists();
  return <ImportView lists={lists} />;
}
