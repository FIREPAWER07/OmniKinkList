import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountView } from "@/components/account/account-view";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("account.title"), robots: { index: false } };
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  );
}
