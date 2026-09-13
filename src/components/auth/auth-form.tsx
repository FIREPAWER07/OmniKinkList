"use client";

import { DiscordLogoIcon, GithubLogoIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signIn, signUp } from "@/lib/auth-client";

type Provider = "discord" | "github";

const PROVIDERS: Record<Provider, { label: string; Icon: typeof DiscordLogoIcon }> = {
  discord: { label: "Discord", Icon: DiscordLogoIcon },
  github: { label: "GitHub", Icon: GithubLogoIcon },
};

/** Only same-origin relative paths are allowed as a post-login destination. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export function AuthForm({ mode, socialProviders }: { mode: "login" | "signup"; socialProviders: Provider[] }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    const { error: failure } =
      mode === "login"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: String(form.get("name") ?? "").trim() || email.split("@")[0] });
    setPending(false);
    if (failure) {
      setError(failure.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-sm px-4 pt-16 md:pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Editor sign in" : "Create an account"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        You do not need an account to use OmniKinkList. Accounts are for people who help edit the lists. An admin has
        to trust your account before you can make changes.
      </p>

      {socialProviders.length > 0 && (
        <>
          <div className="mt-8 grid gap-2">
            {socialProviders.map((provider) => {
              const { label, Icon } = PROVIDERS[provider];
              return (
                <Button
                  key={provider}
                  size="lg"
                  onClick={() => signIn.social({ provider, callbackURL: next })}
                  className="w-full"
                >
                  <Icon size={18} /> Continue with {label}
                </Button>
              );
            })}
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={socialProviders.length ? "grid gap-4" : "mt-8 grid gap-4"}>
        {mode === "signup" && (
          <Field label="Display name" htmlFor="name" hint="Shown in the edit history.">
            <Input id="name" name="name" autoComplete="nickname" maxLength={40} />
          </Field>
        )}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-2 w-full">
          {pending && <SpinnerGapIcon size={18} className="animate-spin" />}
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? "No account yet? " : "Already have an account? "}
        <Link
          href={`${mode === "login" ? "/signup" : "/login"}?next=${encodeURIComponent(next)}`}
          className="font-medium text-accent hover:underline"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
