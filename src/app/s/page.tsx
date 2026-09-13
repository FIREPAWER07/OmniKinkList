import type { Metadata } from "next";
import { SharedView } from "@/components/kinks/shared-view";
import { getAllLists } from "@/lib/kinks/data";

export const metadata: Metadata = {
  title: "Shared list",
  robots: { index: false, follow: false },
};

export default async function SharedPage() {
  const lists = await getAllLists();
  return <SharedView lists={lists} />;
}
