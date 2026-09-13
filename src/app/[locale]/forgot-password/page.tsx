import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.forgotTitle"), robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
