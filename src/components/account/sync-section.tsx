"use client";

import { CloudArrowUpIcon, CloudCheckIcon, LockKeyIcon, LockKeyOpenIcon, WarningIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useLocale, useT } from "@/i18n/client";
import { WrongPassphraseError } from "@/lib/sync/crypto";
import { useSync } from "@/lib/sync/sync-provider";
import { Section } from "./account-view";

const MIN_PASSPHRASE = 12;

type Mode = "enable" | "encrypt" | "change";

export function SyncSection() {
  const t = useT();
  const locale = useLocale();
  const sync = useSync();
  const [mode, setMode] = useState<Mode | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [confirmDecrypt, setConfirmDecrypt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passphrase = String(new FormData(event.currentTarget).get("passphrase") ?? "");
    setError(null);
    try {
      await sync.unlock(passphrase);
      toast.success(t("sync.unlocked"));
    } catch (failure) {
      setError(failure instanceof WrongPassphraseError ? t("sync.wrongPassphrase") : t("auth.errorGeneric"));
    }
  };

  const removeEncryption = async () => {
    try {
      await sync.setPassphrase(null);
      setConfirmDecrypt(false);
      toast.success(t("sync.encryptionRemoved"));
    } catch {
      toast.error(t("auth.errorGeneric"));
    }
  };

  const lastSynced = sync.lastSyncedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(sync.lastSyncedAt))
    : null;

  return (
    <Section title={t("sync.title")} description={t("sync.explain")}>
      <div className="grid gap-4">
        <ul className="grid gap-2 rounded-xl bg-surface-2 p-4 text-sm text-muted">
          <li>{t("sync.point1")}</li>
          <li>{t("sync.point2")}</li>
          <li className="flex gap-2 text-fg">
            <WarningIcon size={16} className="mt-0.5 shrink-0 text-maybe" aria-hidden /> {t("sync.point3")}
          </li>
        </ul>

        {sync.status === "checking" && <p className="text-sm text-muted">{t("common.loading")}</p>}

        {sync.status === "off" && (
          <div>
            <Button variant="primary" onClick={() => setMode("enable")}>
              <CloudArrowUpIcon size={16} /> {t("sync.enable")}
            </Button>
          </div>
        )}

        {sync.status === "locked" && (
          <form onSubmit={unlock} className="grid gap-3">
            <p className="flex items-center gap-2 text-sm">
              <LockKeyIcon size={16} className="text-accent" aria-hidden /> {t("sync.locked")}
            </p>
            <Field label={t("sync.passphrase")} htmlFor="unlock-passphrase" error={error}>
              <Input id="unlock-passphrase" name="passphrase" type="password" autoComplete="off" required />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={sync.busy}>
                {sync.busy ? t("sync.working") : t("sync.unlock")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmOff(true)}>
                {t("sync.forgotPassphrase")}
              </Button>
            </div>
          </form>
        )}

        {sync.status === "paused" && (
          <div className="grid gap-3">
            <p className="flex gap-2 text-sm">
              <WarningIcon size={16} className="mt-0.5 shrink-0 text-maybe" aria-hidden /> {t("sync.paused")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                disabled={sync.busy}
                onClick={() => sync.continueUnencrypted().catch(() => toast.error(t("auth.errorGeneric")))}
              >
                {t("sync.continueUnencrypted")}
              </Button>
              <Button variant="danger" onClick={() => setConfirmOff(true)}>
                {t("sync.turnOff")}
              </Button>
            </div>
          </div>
        )}

        {sync.status === "on" && (
          <>
            <div className="grid gap-1.5 text-sm">
              <p className="flex items-center gap-2 text-like">
                <CloudCheckIcon size={16} weight="fill" aria-hidden /> {lastSynced ? t("sync.onSince", { date: lastSynced }) : t("sync.on")}
              </p>
              <p className="flex gap-2 text-muted">
                {sync.encrypted ? (
                  <LockKeyIcon size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                ) : (
                  <LockKeyOpenIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
                )}
                {sync.encrypted ? t("sync.isEncrypted") : t("sync.notEncrypted")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => sync.syncNow().then(() => toast.success(t("sync.synced")), () => {})} disabled={sync.busy}>
                {t("sync.syncNow")}
              </Button>
              {sync.encrypted ? (
                <>
                  <Button onClick={() => setMode("change")}>{t("sync.changePassphrase")}</Button>
                  <Button onClick={() => setConfirmDecrypt(true)}>{t("sync.removeEncryption")}</Button>
                </>
              ) : (
                <Button onClick={() => setMode("encrypt")}>
                  <LockKeyIcon size={16} aria-hidden /> {t("sync.encrypt")}
                </Button>
              )}
              <Button variant="danger" onClick={() => setConfirmOff(true)}>
                {t("sync.turnOff")}
              </Button>
            </div>
          </>
        )}

        {sync.status === "error" && <p className="text-sm text-danger">{t("sync.error")}</p>}
      </div>

      <Dialog
        open={!!mode}
        onClose={() => setMode(null)}
        title={mode === "change" ? t("sync.changePassphrase") : mode === "encrypt" ? t("sync.encrypt") : t("sync.enable")}
        description={mode === "enable" ? t("sync.enableHint") : t("sync.passphraseHint", { count: MIN_PASSPHRASE })}
      >
        {mode && (
          <PassphraseForm
            key={mode}
            optional={mode === "enable"}
            busy={sync.busy}
            onCancel={() => setMode(null)}
            onSubmit={async (passphrase) => {
              if (mode === "enable") await sync.enable(passphrase);
              else await sync.setPassphrase(passphrase);
              setMode(null);
              toast.success(t(mode === "change" ? "sync.passphraseChanged" : mode === "encrypt" ? "sync.encryptionAdded" : "sync.on"));
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={confirmDecrypt}
        onClose={() => setConfirmDecrypt(false)}
        title={t("sync.removeEncryptionTitle")}
        description={t("sync.removeEncryptionBody")}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDecrypt(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" disabled={sync.busy} onClick={removeEncryption}>
            {t("sync.removeEncryption")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={confirmOff} onClose={() => setConfirmOff(false)} title={t("sync.turnOffTitle")} description={t("sync.turnOffBody")}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOff(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await sync.disable();
              setConfirmOff(false);
            }}
          >
            {t("sync.deleteCloud")}
          </Button>
        </div>
      </Dialog>
    </Section>
  );
}

/** Asks for a new passphrase. When `optional`, encryption is an opt-in and submitting without it passes `null`. */
function PassphraseForm({
  optional,
  busy,
  onSubmit,
  onCancel,
}: {
  optional: boolean;
  busy: boolean;
  onSubmit: (passphrase: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [encrypt, setEncrypt] = useState(!optional);
  const [understood, setUnderstood] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const passphrase = String(form.get("passphrase") ?? "");
    if (encrypt) {
      if (passphrase.length < MIN_PASSPHRASE) return setError(t("sync.passphraseShort", { count: MIN_PASSPHRASE }));
      if (passphrase !== String(form.get("confirm") ?? "")) return setError(t("sync.passphraseDiffer"));
    }
    setError(null);
    try {
      await onSubmit(encrypt ? passphrase : null);
    } catch {
      setError(t("auth.errorGeneric"));
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      {optional && (
        <label className="flex gap-2 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={encrypt}
            onChange={(e) => setEncrypt(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="grid gap-1">
            <span className="font-medium">{t("sync.encryptOption")}</span>
            <span className="text-muted">{encrypt ? t("sync.passphraseHint", { count: MIN_PASSPHRASE }) : t("sync.encryptOptionHint")}</span>
          </span>
        </label>
      )}
      {encrypt && (
        <>
          <Field label={t("sync.passphrase")} htmlFor="sync-passphrase">
            <Input id="sync-passphrase" name="passphrase" type="password" autoComplete="new-password" required autoFocus={!optional} />
          </Field>
          <Field label={t("sync.confirmPassphrase")} htmlFor="sync-confirm" error={error}>
            <Input id="sync-confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            />
            {t("sync.understand")}
          </label>
        </>
      )}
      {!encrypt && error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={(encrypt && !understood) || busy}>
          {busy ? t("sync.working") : t("common.continue")}
        </Button>
      </div>
    </form>
  );
}
