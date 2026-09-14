"use client";

import { EnvelopeSimpleIcon, GoogleLogoIcon, ShieldCheckIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useHref, useLocale, useT } from "@/i18n/client";
import { signIn, signUp } from "@/lib/auth-client";

type Provider = "google" | "simplelogin";

/** Only same-origin relative paths are allowed as a post-login destination. */
export function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function AuthForm({ mode, socialProviders }: { mode: "login" | "signup"; socialProviders: Provider[] }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"), href("/account"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  const fetchOptions = captchaToken ? { headers: { "x-captcha-response": captchaToken } } : undefined;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    const callbackURL = next;
    const { data, error: failure } =
      mode === "login"
        ? await signIn.email({ email, password, callbackURL, fetchOptions })
        : await signUp.email({
            email,
            password,
            name: String(form.get("name") ?? "").trim() || email.split("@")[0],
            locale,
            callbackURL,
            fetchOptions,
          });
    setPending(false);
    setCaptchaReset((k) => k + 1);
    if (failure) {
      if (failure.status === 403 && mode === "login") setError(t("auth.errorUnverified"));
      else if (failure.status === 429) setError(t("auth.errorRateLimited"));
      else setError(failure.message ?? t("auth.errorGeneric"));
      return;
    }
    // Without required email verification the new account is signed in right away.
    if (mode === "signup" && !(data && "token" in data && data.token)) {
      setSentTo(email);
      return;
    }
    router.push(next);
    router.refresh();
  };

  const social = async (provider: Provider) => {
    setPending(true);
    setError(null);
    // On success the client navigates to the provider, so only failures need handling here.
    const { error: failure } = await signIn.social({ provider, callbackURL: next }).catch((cause: unknown) => ({
      error: { status: 0, message: cause instanceof Error ? cause.message : undefined },
    }));
    if (!failure) return;
    setPending(false);
    console.error("Social sign-in failed", failure);
    if (failure.status === 429) setError(t("auth.errorRateLimited"));
    else setError(failure.message || t("auth.errorGeneric"));
  };

  if (sentTo) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-24 text-center">
        <EnvelopeSimpleIcon size={44} weight="duotone" className="mx-auto text-accent" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("auth.checkInboxTitle")}</h1>
        <p className="mt-3 text-muted">{t("auth.checkInboxBody", { email: sentTo })}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-16 md:pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? t("auth.signInTitle") : t("auth.signUpTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("auth.intro")}</p>

      {socialProviders.length > 0 && (
        <>
          <div className="mt-8 grid gap-2">
            {socialProviders.map((provider) => (
              <Button key={provider} size="lg" onClick={() => social(provider)} disabled={pending} className="w-full">
                {provider === "google" ? <GoogleLogoIcon size={18} /> : <ShieldCheckIcon size={18} />}
                {provider === "google" ? t("auth.withGoogle") : t("auth.withProton")}
              </Button>
            ))}
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-border" /> {t("auth.orEmail")} <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={socialProviders.length ? "grid gap-4" : "mt-8 grid gap-4"}>
        {mode === "signup" && (
          <Field label={t("auth.name")} htmlFor="name" hint={t("auth.nameHint")}>
            <Input id="name" name="name" autoComplete="nickname" maxLength={40} />
          </Field>
        )}
        <Field label={t("auth.email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" hint={mode === "signup" ? t("auth.passwordHint") : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={10}
            required
          />
        </Field>
        {mode === "login" && (
          <Link href={href("/forgot-password")} className="-mt-2 justify-self-end text-sm text-accent hover:underline">
            {t("auth.forgot")}
          </Link>
        )}
        <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-2 w-full">
          {pending && <SpinnerGapIcon size={18} className="animate-spin" />}
          {mode === "login" ? t("auth.signInButton") : t("auth.signUpButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <Link href={`${href(mode === "login" ? "/signup" : "/login")}?next=${encodeURIComponent(next)}`} className="font-medium text-accent hover:underline">
          {mode === "login" ? t("auth.createOne") : t("auth.signInLink")}
        </Link>
      </p>
    </div>
  );
}
