import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { enabledSocialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" socialProviders={enabledSocialProviders} />
    </Suspense>
  );
}
