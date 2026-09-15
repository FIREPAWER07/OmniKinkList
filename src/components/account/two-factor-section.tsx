"use client";

import { CheckCircleIcon, CopyIcon } from "@phosphor-icons/react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { twoFactorErrorKey } from "@/components/auth/two-factor-form";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";
import { Section } from "./account-view";

type Method = "app" | "email";
type Setup = { totpURI: string; backupCodes: string[] } | null;
type Failure = { message?: string; code?: string; status: number };

export function TwoFactorSection({
  method,
  email,
  hasPassword,
  onChange,
}: {
  method: Method | null;
  email: string;
  hasPassword: boolean;
  onChange: () => Promise<void>;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [choice, setChoice] = useState<Method>("app");
  const [setup, setSetup] = useState<Setup>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const qr = useMemo(() => (setup ? renderSVG(setup.totpURI, { pixelSize: 5, whiteColor: "#ffffff", blackColor: "#16070d" }) : ""), [setup]);
  const secret = setup ? new URL(setup.totpURI.replace("otpauth://", "https://")).searchParams.get("secret") : null;
  const passwordArg = hasPassword ? { password } : {};

  const run = async (action: () => Promise<{ error: Failure | null }>, codeRequest = false) => {
    setPending(true);
    setError(null);
    const { error: failure } = await action();
    setPending(false);
    if (failure) setError(codeRequest ? t(twoFactorErrorKey(failure, choice === "email")) : (failure.message ?? t("auth.errorGeneric")));
    return !failure;
  };

  const start = () =>
    run(async () => {
      const result = await authClient.twoFactor.enable(passwordArg as { password: string });
      if (result.data && "totpURI" in result.data) setSetup({ totpURI: result.data.totpURI, backupCodes: result.data.backupCodes });
      return result;
    });

  // Email is turned on by confirming a code sent to it, so nobody is locked out by an address that doesn't get mail.
  const sendEmailCode = () => run(() => authClient.twoFactor.sendOtp(), true);

  const confirmed = async () => {
    toast.success(t("account.twoFactorOn"));
    await onChange();
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    const ok = await run(() => authClient.twoFactor.verifyTotp({ code }), true);
    if (ok && setup) {
      setCodes(setup.backupCodes);
      setSetup(null);
      await confirmed();
    }
  };

  const confirmEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    if (await run(() => authClient.twoFactor.verifyOtp({ code }), true)) {
      setEmailSent(false);
      await confirmed();
    }
  };

  const passwordField = hasPassword && (
    <Field label={t("account.currentPassword")} htmlFor="twofa-password">
      <Input id="twofa-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
    </Field>
  );

  const errorMessage = <FormError>{error}</FormError>;

  return (
    <Section title={t("account.twoFactor")} description={t("account.twoFactorHint")}>
      <div className="grid gap-4">
        {codes && (
          <div className="rounded-xl border border-accent/40 bg-accent-soft p-4">
            <p className="font-medium">{t("account.backupCodesTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("account.backupCodesHint")}</p>
            <pre className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <span key={c}>{c}</span>)}</pre>
            <Button
              size="sm"
              className="mt-3"
              onClick={async () => {
                await navigator.clipboard.writeText(codes.join("\n"));
                toast.success(t("common.copied"));
              }}
            >
              <CopyIcon size={14} /> {t("common.copy")}
            </Button>
          </div>
        )}

        {method ? (
          <>
            <div className="grid gap-1">
              <p className="inline-flex items-center gap-2 text-sm text-success">
                <CheckCircleIcon size={16} weight="fill" aria-hidden /> {t("account.twoFactorOn")}
              </p>
              <p className="text-sm text-muted wrap-anywhere">{method === "app" ? t("account.usingApp") : t("account.usingEmail", { email })}</p>
            </div>
            {passwordField}
            {errorMessage}
            <div className="flex flex-wrap gap-2">
              {method === "app" && (
                <Button
                  disabled={pending || (hasPassword && !password)}
                  onClick={() =>
                    run(async () => {
                      const result = await authClient.twoFactor.generateBackupCodes(passwordArg as { password: string });
                      if (result.data) setCodes(result.data.backupCodes);
                      return result;
                    })
                  }
                >
                  {t("account.newBackupCodes")}
                </Button>
              )}
              <Button
                variant="danger"
                disabled={pending || (hasPassword && !password)}
                onClick={async () => {
                  if (await run(() => authClient.twoFactor.disable(passwordArg as { password: string }))) {
                    toast.success(t("account.twoFactorOff"));
                    await onChange();
                  }
                }}
              >
                {t("account.turnOff")}
              </Button>
            </div>
          </>
        ) : setup ? (
          <form onSubmit={confirm} className="grid gap-4">
            <p className="text-sm text-muted">{t("account.scanQr")}</p>
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="w-44 overflow-hidden rounded-lg bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
              <div className="text-sm">
                <p className="text-muted">{t("account.secretKey")}</p>
                <code className="mt-1 block break-all font-mono text-xs">{secret}</code>
              </div>
            </div>
            <Field label={t("auth.code")} htmlFor="twofa-code">
              <Input id="twofa-code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="max-w-40 font-mono tracking-widest" />
            </Field>
            {errorMessage}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={pending}>
                {t("auth.verify")}
              </Button>
              <Button variant="ghost" onClick={() => setSetup(null)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        ) : emailSent ? (
          <form onSubmit={confirmEmail} className="grid gap-4">
            <p className="text-sm text-muted wrap-anywhere">{t("account.emailCodeSent", { email })}</p>
            <Field label={t("auth.code")} htmlFor="twofa-email-code">
              <Input id="twofa-email-code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="max-w-40 font-mono tracking-widest" />
            </Field>
            {errorMessage}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={pending}>
                {t("auth.verify")}
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={async () => {
                  if (await sendEmailCode()) toast.success(t("auth.codeResent"));
                }}
              >
                {t("auth.resendCode")}
              </Button>
              <Button variant="ghost" onClick={() => setEmailSent(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">{t("account.twoFactorMethod")}</legend>
              {(["app", "email"] as const).map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong has-checked:border-accent has-checked:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="twofa-method"
                    value={option}
                    checked={choice === option}
                    onChange={() => {
                      setChoice(option);
                      setError(null);
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="grid min-w-0 gap-1">
                    <span className="text-sm font-medium">{option === "app" ? t("account.methodApp") : t("account.methodEmail")}</span>
                    <span className="text-xs leading-relaxed text-muted wrap-anywhere">
                      {option === "app" ? t("account.methodAppHint") : t("account.methodEmailHint", { email })}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {choice === "app" && passwordField}
            {errorMessage}
            <div>
              <Button
                variant="primary"
                disabled={pending || (choice === "app" && hasPassword && !password)}
                onClick={async () => {
                  if (choice === "app") await start();
                  else if (await sendEmailCode()) setEmailSent(true);
                }}
              >
                {t("account.turnOn")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
