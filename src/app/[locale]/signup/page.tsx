import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { getT } from "@/i18n/server";
import { enabledSocialProviders } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.signUpTitle"), robots: { index: false } };
}

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" socialProviders={enabledSocialProviders} />
    </Suspense>
  );
}
