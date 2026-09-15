"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Turnstile } from "@/components/turnstile";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { useHref, useT } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const t = useT();
  const href = useHref();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setPending(true);
    // Same response whether or not the email exists, so accounts can't be discovered.
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}${href("/reset-password")}`,
      fetchOptions: token ? { headers: { "x-captcha-response": token } } : undefined,
    });
    setPending(false);
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-sm px-4 pt-16 md:pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
      {sent ? (
        <p className="mt-4 flex gap-2 rounded-lg bg-surface-2 p-4 text-sm text-muted">
          <CheckCircleIcon size={18} className="shrink-0 text-accent" aria-hidden /> {t("auth.forgotSent")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t("auth.forgotBody")}</p>
          <form onSubmit={onSubmit} className="mt-8 grid gap-4">
            <Field label={t("auth.email")} htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Turnstile onToken={setToken} />
            <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
              {t("auth.sendLink")}
            </Button>
          </form>
        </>
      )}
      <Link href={href("/login")} className="mt-6 inline-block text-sm text-accent hover:underline">
        {t("auth.backToSignIn")}
      </Link>
    </div>
  );
}

export function ResetPasswordForm() {
  const t = useT();
  const href = useHref();
  const params = useSearchParams();
  const token = params.get("token");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) return setError(t("auth.passwordsDiffer"));
    setPending(true);
    const { error: failure } = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
    setPending(false);
    if (failure) setError(failure.message ?? t("auth.resetInvalid"));
    else setDone(true);
  };

  if (!token || params.get("error")) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
        <p className="mt-3 text-muted">{t("auth.resetInvalid")}</p>
        <Link href={href("/forgot-password")} className={buttonClass("primary", "md", "mt-8")}>
          {t("auth.sendLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-16 md:pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
      {done ? (
        <>
          <p className="mt-4 text-muted">{t("auth.resetDone")}</p>
          <Link href={href("/login")} className={buttonClass("primary", "md", "mt-6")}>
            {t("auth.signInButton")}
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <Field label={t("auth.newPassword")} htmlFor="password" hint={t("auth.passwordHint")}>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          </Field>
          <Field label={t("auth.confirmPassword")} htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
            {t("auth.resetButton")}
          </Button>
        </form>
      )}
    </div>
  );
}
