"use client";

import { CheckCircleIcon, UserCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { useHref, useLocale, useT } from "@/i18n/client";
import { setInitialPassword, updateLocale, updateProfile } from "@/lib/account/actions";
import { BIO_MAX, NAME_MAX, USERNAME_MAX, USERNAME_MIN } from "@/lib/account/profile";
import { authClient } from "@/lib/auth-client";
import { useSync } from "@/lib/sync/sync-provider";
import { Section } from "./account-view";

interface SessionUser {
  name: string;
  email: string;
  emailVerified: boolean;
  locale?: string | null;
  username?: string | null;
  bio?: string | null;
  profilePublic?: boolean | null;
}

export function ProfileSection({ user, onChange }: { user: SessionUser; onChange: () => Promise<void> }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [profilePublic, setProfilePublic] = useState(user.profilePublic ?? true);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const profilePath = href(`/u/${user.username ?? ""}`);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setUsernameError(null);
    const result = await updateProfile({ name, username, bio, profilePublic });
    if (result.ok && user.locale !== locale) await updateLocale(locale);
    setPending(false);
    if (result.ok) {
      setUsername(result.username);
      toast.success(t("common.saved"));
      await onChange();
      // Profile pages visited earlier are kept by the router; drop them so they show the saved version.
      router.refresh();
    } else if (result.error === "username-taken") setUsernameError(t("account.usernameTaken"));
    else if (result.error === "invalid" && result.field === "username") setUsernameError(t("account.usernameInvalid"));
    else toast.error(result.error === "rate-limited" ? t("auth.errorRateLimited") : t("auth.errorGeneric"));
  };

  return (
    <Section id="profile" title={t("account.profile")} description={t("account.profileHint")}>
      <form onSubmit={save} className="grid gap-4">
        <Field label={t("auth.name")} htmlFor="account-name">
          <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} required />
        </Field>
        <Field
          label={t("account.username")}
          htmlFor="account-username"
          hint={t("account.usernameHint", { url: `${window.location.origin}${profilePath}` })}
          error={usernameError}
        >
          <div className="flex">
            <span className="grid place-items-center rounded-l-lg border border-r-0 border-border bg-surface-2 px-3 font-mono text-sm text-muted">@</span>
            <Input
              id="account-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              minLength={USERNAME_MIN}
              maxLength={USERNAME_MAX}
              pattern="[a-z0-9_]+"
              title={t("account.usernameInvalid")}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-invalid={!!usernameError}
              className="rounded-l-none font-mono"
            />
          </div>
        </Field>
        <Field label={t("account.bio")} htmlFor="account-bio" hint={t("account.bioHint", { count: bio.length, max: BIO_MAX })}>
          <Textarea id="account-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} rows={3} />
        </Field>
        <label className="flex gap-2 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={profilePublic}
            onChange={(e) => setProfilePublic(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="grid gap-1">
            <span className="font-medium">{t("account.profilePublic")}</span>
            <span className="text-muted">{t("account.profilePublicHint")}</span>
          </span>
        </label>
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
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            {t("common.save")}
          </Button>
          <Link href={profilePath} className={buttonClass("ghost", "md")}>
            <UserCircleIcon size={16} aria-hidden /> {t("account.viewProfile")}
          </Link>
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
        <FormError>{error}</FormError>
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
        <FormError>{error}</FormError>
        <div>
          <Button variant="danger" disabled={confirmText !== email || (hasPassword && !password)} onClick={remove}>
            {t("account.deleteButton")}
          </Button>
        </div>
      </div>
    </Section>
  );
}
