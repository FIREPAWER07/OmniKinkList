import type { Metadata } from "next";
import { Suspense } from "react";
import { TwoFactorForm } from "@/components/auth/two-factor-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.twoFactorTitle"), robots: { index: false } };
}

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  );
}
