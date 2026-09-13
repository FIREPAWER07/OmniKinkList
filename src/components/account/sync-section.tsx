"use client";

import { CloudArrowUpIcon, CloudCheckIcon, LockKeyIcon, WarningIcon } from "@phosphor-icons/react";
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

export function SyncSection() {
  const t = useT();
  const locale = useLocale();
  const sync = useSync();
  const [mode, setMode] = useState<"enable" | "change" | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
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

        {sync.status === "on" && (
          <>
            <p className="flex items-center gap-2 text-sm text-like">
              <CloudCheckIcon size={16} weight="fill" aria-hidden /> {lastSynced ? t("sync.onSince", { date: lastSynced }) : t("sync.on")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => sync.syncNow().then(() => toast.success(t("sync.synced")))} disabled={sync.busy}>
                {t("sync.syncNow")}
              </Button>
              <Button onClick={() => setMode("change")}>{t("sync.changePassphrase")}</Button>
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
        title={mode === "change" ? t("sync.changePassphrase") : t("sync.enable")}
        description={t("sync.passphraseHint", { count: MIN_PASSPHRASE })}
      >
        <PassphraseForm
          busy={sync.busy}
          onCancel={() => setMode(null)}
          onSubmit={async (passphrase) => {
            if (mode === "change") await sync.changePassphrase(passphrase);
            else await sync.enable(passphrase);
            setMode(null);
            toast.success(t("sync.on"));
          }}
        />
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

function PassphraseForm({ busy, onSubmit, onCancel }: { busy: boolean; onSubmit: (passphrase: string) => Promise<void>; onCancel: () => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const passphrase = String(form.get("passphrase") ?? "");
    if (passphrase.length < MIN_PASSPHRASE) return setError(t("sync.passphraseShort", { count: MIN_PASSPHRASE }));
    if (passphrase !== String(form.get("confirm") ?? "")) return setError(t("sync.passphraseDiffer"));
    setError(null);
    try {
      await onSubmit(passphrase);
    } catch {
      setError(t("auth.errorGeneric"));
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label={t("sync.passphrase")} htmlFor="sync-passphrase">
        <Input id="sync-passphrase" name="passphrase" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field label={t("sync.confirmPassphrase")} htmlFor="sync-confirm" error={error}>
        <Input id="sync-confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" />
        {t("sync.understand")}
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={!understood || busy}>
          {busy ? t("sync.working") : t("common.continue")}
        </Button>
      </div>
    </form>
  );
}
