import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { getT } from "@/i18n/server";
import { enabledSocialProviders } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.signInTitle"), robots: { index: false } };
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" socialProviders={enabledSocialProviders} />
    </Suspense>
  );
}
