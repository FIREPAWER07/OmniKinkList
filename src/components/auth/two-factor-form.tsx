"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { useHref, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translator";
import { authClient } from "@/lib/auth-client";
import { BANNED_ERROR_CODE } from "@/lib/moderation";
import { safeNext } from "./auth-form";

/** The message for a failed two-factor request. Emailed codes can be replaced; an expired sign-in has to start over. */
export function twoFactorErrorKey(failure: { code?: string; status: number }, emailCode: boolean): MessageKey {
  if (failure.code === BANNED_ERROR_CODE) return "auth.errorBanned";
  if (failure.status === 429) return "auth.errorRateLimited";
  if (failure.code === "INVALID_TWO_FACTOR_COOKIE") return "auth.twoFactorExpired";
  if (failure.code === "OTP_HAS_EXPIRED") return "auth.codeExpired";
  if (failure.code === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") return emailCode ? "auth.codeExpired" : "auth.twoFactorExpired";
  return "auth.twoFactorInvalid";
}

/** Second step of signing in, for accounts with two-factor authentication. */
export function TwoFactorForm() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), href("/account"));
  const email = params.get("method") === "email";
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\s+/g, "");
    const trustDevice = form.get("trust") === "on";
    setPending(true);
    setError(null);
    setNotice(null);
    const { error: failure } = email
      ? await authClient.twoFactor.verifyOtp({ code, trustDevice })
      : useBackup
        ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
        : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    setPending(false);
    if (failure) {
      setError(t(twoFactorErrorKey(failure, email)));
      return;
    }
    router.push(next);
    router.refresh();
  };

  const resend = async () => {
    setPending(true);
    setError(null);
    setNotice(null);
    const { error: failure } = await authClient.twoFactor.sendOtp();
    setPending(false);
    if (failure) setError(t(twoFactorErrorKey(failure, true)));
    else setNotice(t("auth.codeResent"));
  };

  const backup = !email && useBackup;

  return (
    <div className="mx-auto max-w-sm px-4 pt-16 md:pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.twoFactorTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{email ? t("auth.emailCodeBody") : backup ? t("auth.backupBody") : t("auth.twoFactorBody")}</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <Field label={backup ? t("auth.backupCode") : t("auth.code")} htmlFor="code">
          <Input
            id="code"
            name="code"
            key={backup ? "backup" : "code"}
            inputMode={backup ? "text" : "numeric"}
            autoComplete="one-time-code"
            pattern={backup ? undefined : "[0-9 ]{6,7}"}
            required
            autoFocus
            className="font-mono tracking-widest"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="trust" className="size-4 accent-[var(--accent)]" /> {t("auth.trustDevice")}
        </label>
        <FormError>{error}</FormError>
        {notice && (
          <p role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            {notice}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
          {t("auth.verify")}
        </Button>
      </form>
      {email ? (
        <button type="button" onClick={resend} disabled={pending} className="mt-6 text-sm text-accent hover:underline disabled:opacity-50">
          {t("auth.resendCode")}
        </button>
      ) : (
        <button type="button" onClick={() => setUseBackup((v) => !v)} className="mt-6 text-sm text-accent hover:underline">
          {useBackup ? t("auth.useAuthenticator") : t("auth.useBackup")}
        </button>
      )}
    </div>
  );
}
