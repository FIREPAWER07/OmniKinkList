"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useHref, useT } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";
import { BANNED_ERROR_CODE } from "@/lib/moderation";
import { safeNext } from "./auth-form";

/** Second step of signing in, for accounts with two-factor authentication. */
export function TwoFactorForm() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"), href("/account"));
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\s+/g, "");
    const trustDevice = form.get("trust") === "on";
    setPending(true);
    setError(null);
    const { error: failure } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    setPending(false);
    if (failure) {
      setError(failure.code === BANNED_ERROR_CODE ? t("auth.errorBanned") : failure.status === 429 ? t("auth.errorRateLimited") : t("auth.twoFactorInvalid"));
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-sm px-4 pt-16 md:pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.twoFactorTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{useBackup ? t("auth.backupBody") : t("auth.twoFactorBody")}</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <Field label={useBackup ? t("auth.backupCode") : t("auth.code")} htmlFor="code">
          <Input
            id="code"
            name="code"
            key={useBackup ? "backup" : "totp"}
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            pattern={useBackup ? undefined : "[0-9 ]{6,7}"}
            required
            autoFocus
            className="font-mono tracking-widest"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="trust" className="size-4 accent-[var(--accent)]" /> {t("auth.trustDevice")}
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
          {t("auth.verify")}
        </Button>
      </form>
      <button type="button" onClick={() => setUseBackup((v) => !v)} className="mt-6 text-sm text-accent hover:underline">
        {useBackup ? t("auth.useAuthenticator") : t("auth.useBackup")}
      </button>
    </div>
  );
}
