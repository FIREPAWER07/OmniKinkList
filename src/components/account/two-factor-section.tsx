"use client";

import { CheckCircleIcon, CopyIcon } from "@phosphor-icons/react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";
import { Section } from "./account-view";

type Setup = { totpURI: string; backupCodes: string[] } | null;

export function TwoFactorSection({ enabled, hasPassword, onChange }: { enabled: boolean; hasPassword: boolean; onChange: () => Promise<void> }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<Setup>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const qr = useMemo(() => (setup ? renderSVG(setup.totpURI, { pixelSize: 5, whiteColor: "#ffffff", blackColor: "#16070d" }) : ""), [setup]);
  const secret = setup ? new URL(setup.totpURI.replace("otpauth://", "https://")).searchParams.get("secret") : null;
  const passwordArg = hasPassword ? { password } : {};

  const run = async (action: () => Promise<{ error: { message?: string } | null }>) => {
    setPending(true);
    setError(null);
    const { error: failure } = await action();
    setPending(false);
    if (failure) setError(failure.message ?? t("auth.errorGeneric"));
    return !failure;
  };

  const start = () =>
    run(async () => {
      const result = await authClient.twoFactor.enable(passwordArg as { password: string });
      if (result.data && "totpURI" in result.data) setSetup({ totpURI: result.data.totpURI, backupCodes: result.data.backupCodes });
      return result;
    });

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    const ok = await run(() => authClient.twoFactor.verifyTotp({ code }));
    if (ok && setup) {
      setCodes(setup.backupCodes);
      setSetup(null);
      toast.success(t("account.twoFactorOn"));
      await onChange();
    }
  };

  const passwordField = hasPassword && (
    <Field label={t("account.currentPassword")} htmlFor="twofa-password">
      <Input id="twofa-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
    </Field>
  );

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

        {enabled ? (
          <>
            <p className="inline-flex items-center gap-2 text-sm text-like">
              <CheckCircleIcon size={16} weight="fill" aria-hidden /> {t("account.twoFactorOn")}
            </p>
            {passwordField}
            {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
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
            {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={pending}>
                {t("auth.verify")}
              </Button>
              <Button variant="ghost" onClick={() => setSetup(null)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <>
            {passwordField}
            {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div>
              <Button variant="primary" disabled={pending || (hasPassword && !password)} onClick={start}>
                {t("account.turnOn")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
