"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useHref, useLocale, useT } from "@/i18n/client";
import { setInitialPassword, updateLocale } from "@/lib/account/actions";
import { authClient } from "@/lib/auth-client";
import { useSync } from "@/lib/sync/sync-provider";
import { Section } from "./account-view";

interface SessionUser {
  name: string;
  email: string;
  emailVerified: boolean;
  locale?: string | null;
}

export function ProfileSection({ user, onChange }: { user: SessionUser; onChange: () => Promise<void> }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const [name, setName] = useState(user.name);
  const [pending, setPending] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    if (!error && user.locale !== locale) await updateLocale(locale);
    setPending(false);
    if (error) toast.error(error.message ?? t("auth.errorGeneric"));
    else {
      toast.success(t("common.saved"));
      await onChange();
    }
  };

  return (
    <Section title={t("account.profile")} description={t("account.profileHint")}>
      <form onSubmit={save} className="grid gap-4">
        <Field label={t("auth.name")} htmlFor="account-name">
          <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </Field>
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("auth.email")}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {user.email}
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-like">
                <CheckCircleIcon size={14} weight="fill" aria-hidden /> {t("account.verified")}
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-maybe">
                  <WarningCircleIcon size={14} weight="fill" aria-hidden /> {t("account.notVerified")}
                </span>
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={async () => {
                    await authClient.sendVerificationEmail({ email: user.email, callbackURL: href("/account") });
                    toast.success(t("account.verificationSent"));
                  }}
                >
                  {t("account.resendVerification")}
                </button>
              </>
            )}
          </p>
        </div>
        <div>
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

export function PasswordSection({ hasPassword, providers, onChange }: { hasPassword: boolean; providers: string[]; onChange: () => Promise<void> }) {
  const t = useT();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword") ?? "");
    setPending(true);
    setError(null);
    let failed: string | null = null;
    if (hasPassword) {
      const { error: failure } = await authClient.changePassword({
        currentPassword: String(form.get("currentPassword") ?? ""),
        newPassword,
        revokeOtherSessions: true,
      });
      if (failure) failed = failure.message ?? t("auth.errorGeneric");
    } else {
      const result = await setInitialPassword(newPassword);
      if (!result.ok) failed = t("auth.passwordHint");
    }
    setPending(false);
    setError(failed);
    if (!failed) {
      toast.success(t("account.passwordSaved"));
      formElement.reset();
      await onChange();
    }
  };

  return (
    <Section
      title={t("account.password")}
      description={providers.length > 0 ? t("account.linkedWith", { providers: providers.map((p) => (p === "simplelogin" ? "Proton / SimpleLogin" : "Google")).join(", ") }) : undefined}
    >
      <form onSubmit={submit} className="grid gap-4">
        {hasPassword && (
          <Field label={t("account.currentPassword")} htmlFor="current-password">
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
        )}
        <Field label={hasPassword ? t("auth.newPassword") : t("account.setPassword")} htmlFor="new-password" hint={t("auth.passwordHint")}>
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {hasPassword ? t("account.changePassword") : t("account.setPassword")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

export function DangerZone({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const sync = useSync();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setError(null);
    await sync.disable();
    const { error: failure } = await authClient.deleteUser(hasPassword ? { password } : {});
    if (failure) {
      setError(failure.message ?? t("auth.errorGeneric"));
      return;
    }
    toast.success(t("account.deleted"));
    router.push(href("/"));
    router.refresh();
  };

  return (
    <Section title={t("account.delete")} description={t("account.deleteHint")}>
      <div className="grid gap-4">
        <Field label={t("account.deleteConfirmLabel", { email })} htmlFor="delete-confirm">
          <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </Field>
        {hasPassword && (
          <Field label={t("account.currentPassword")} htmlFor="delete-password">
            <Input id="delete-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <Button variant="danger" disabled={confirmText !== email || (hasPassword && !password)} onClick={remove}>
            {t("account.deleteButton")}
          </Button>
        </div>
      </div>
    </Section>
  );
}
