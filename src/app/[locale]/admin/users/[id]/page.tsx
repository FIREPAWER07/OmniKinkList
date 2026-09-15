import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { EndSessionButton, RejectPendingSuggestions, SignOutEverywhere, UserActions } from "@/components/admin/user-moderation";
import { StatusBadges } from "@/components/admin/user-table";
import { getUserDetail } from "@/lib/admin/queries";
import { isBanActive } from "@/lib/moderation";
import { ROLE_LABELS } from "@/lib/roles";
import { requirePageRole } from "@/lib/session";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

const PROVIDER_LABELS: Record<string, string> = { credential: "Email and password", google: "Google", simplelogin: "Proton (SimpleLogin)" };

const SUGGESTION_STATUS_STYLES = {
  pending: "bg-accent-soft text-accent-text",
  accepted: "bg-success/15 text-success",
  rejected: "bg-surface-2 text-muted",
} as const;

/** Checked in order: Edge and Opera also claim to be Chrome, and Chrome claims to be Safari. */
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];
/** Checked in order: Android also claims to be Linux, and iOS to be macOS. */
const SYSTEMS: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPad/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

/** "Firefox on Windows", good enough to tell sessions apart. */
function describeUserAgent(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const first = (patterns: [RegExp, string][], fallback: string) => patterns.find(([pattern]) => pattern.test(userAgent))?.[1] ?? fallback;
  return `${first(BROWSERS, "Unknown browser")} on ${first(SYSTEMS, "an unknown system")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function UserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <User params={params} />
    </Suspense>
  );
}

async function User({ params }: Pick<PageProps<"/[locale]/admin/users/[id]">, "params">) {
  const { id } = await params;
  const me = await requirePageRole("admin", `/admin/users/${id}`);
  const detail = await getUserDetail(id);

  const back = (
    <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeftIcon size={14} /> All users
    </Link>
  );

  // Not `notFound()`: after deleting an account, this page re-renders once before the browser moves on.
  if (!detail) {
    return (
      <section>
        {back}
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted">This account does not exist or was deleted.</p>
      </section>
    );
  }

  const { profile, accounts, sessions, vault, recentSuggestions, suggestionTotals, moderation, edits } = detail;
  const banned = isBanActive(profile);
  const lastBan = moderation.find((entry) => entry.action === "ban");
  const isSelf = profile.id === me.id;

  return (
    <section>
      {back}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-semibold tracking-tight">
            <span className="break-all">{profile.name}</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-text">{ROLE_LABELS[profile.role]}</span>
          </h1>
          <p className="mt-1 break-all text-sm text-muted">{profile.email}</p>
        </div>
        <UserActions
          target={{ id: profile.id, name: profile.name, email: profile.email, role: profile.role, banned, banReason: profile.banReason }}
          isSelf={isSelf}
          pendingSuggestions={suggestionTotals.pending}
        />
      </div>

      {banned && (
        <div role="status" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
          <p className="font-medium text-danger">
            Banned {profile.banExpires ? `until ${dateTimeFormat.format(profile.banExpires)} UTC` : "until an admin lifts the ban"}
          </p>
          {lastBan && (
            <p className="mt-0.5 text-muted">
              By {lastBan.userName} on {dateTimeFormat.format(lastBan.createdAt)} UTC
            </p>
          )}
          {profile.banReason && <p className="mt-3 whitespace-pre-line border-l-2 border-danger/60 pl-3">{profile.banReason}</p>}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <Panel title="Account">
            <dl className="grid gap-3 px-5 py-4 text-sm">
              <Detail label="Status">
                <StatusBadges banned={banned} emailVerified={profile.emailVerified} />
              </Detail>
              <Detail label="User id">
                <span className="font-mono text-xs">{profile.id}</span>
              </Detail>
              <Detail label="Profile">
                {profile.profilePublic ? (
                  <Link href={`/u/${profile.username}`} className="font-mono text-xs text-accent hover:underline">
                    @{profile.username}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">@{profile.username}</span>
                )}
                <span className="text-muted"> · {profile.profilePublic ? "Public" : "Private, only they can open it"}</span>
              </Detail>
              <Detail label="Joined">{dateTimeFormat.format(profile.createdAt)} UTC</Detail>
              <Detail label="Profile updated">{dateTimeFormat.format(profile.updatedAt)} UTC</Detail>
              <Detail label="Sign-in methods">{accounts.length ? accounts.map((a) => PROVIDER_LABELS[a.providerId] ?? a.providerId).join(", ") : "None"}</Detail>
              <Detail label="Two-factor">{profile.twoFactorEnabled ? "On" : "Off"}</Detail>
              <Detail label="Language">{profile.locale.toUpperCase()}</Detail>
              <Detail label="Synced answers">
                {vault
                  ? `${vault.encrypted ? "End-to-end encrypted" : "Not encrypted"}, ${formatBytes(vault.bytes)}, last synced ${dateFormat.format(vault.updatedAt)}`
                  : "Sync is off"}
              </Detail>
            </dl>
            <p className="border-t border-border px-5 py-3 text-xs text-subtle">Answers are private, so their content is never shown here.</p>
          </Panel>

          <Panel title={`Active sessions (${sessions.length})`} action={!isSelf && <SignOutEverywhere userId={profile.id} name={profile.name} count={sessions.length} />}>
            {sessions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Not signed in anywhere.</p>
            ) : (
              <ul className="divide-y divide-border">
                {sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{describeUserAgent(s.userAgent)}</p>
                      <p className="font-mono text-xs text-subtle">
                        {s.ipAddress ?? "Unknown IP"} · signed in {dateFormat.format(s.createdAt)} · active {dateFormat.format(s.updatedAt)} · expires{" "}
                        {dateFormat.format(s.expiresAt)}
                      </p>
                    </div>
                    {!isSelf && <EndSessionButton userId={profile.id} sessionId={s.id} />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Suggestions"
            action={suggestionTotals.pending > 0 && !isSelf && <RejectPendingSuggestions userId={profile.id} name={profile.name} count={suggestionTotals.pending} />}
          >
            <p className="px-5 pt-4 text-sm text-muted">
              {suggestionTotals.pending} pending, {suggestionTotals.accepted} accepted, {suggestionTotals.rejected} rejected. Only suggestions sent while signed in are
              counted.
            </p>
            {recentSuggestions.length === 0 ? (
              <p className="px-5 pb-5 pt-2 text-sm text-subtle">No suggestions from this account.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border border-t border-border">
                {recentSuggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      {s.name} <span className="font-mono text-xs text-subtle">/{s.listSlug}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-subtle">{dateFormat.format(s.createdAt)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SUGGESTION_STATUS_STYLES[s.status]}`}>{s.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="grid content-start gap-6">
          <Panel title="Moderation history">
            {moderation.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No bans or role changes.</p>
            ) : (
              <ol className="grid gap-3 px-5 py-4">
                {moderation.map((entry) => {
                  const reason = entry.action === "ban" && entry.after ? (JSON.parse(entry.after) as { reason?: string }).reason : undefined;
                  return (
                    <li key={entry.id} className="text-sm">
                      <p className="leading-snug">
                        <span className="font-medium">{entry.userName}</span> <span className="text-muted">{entry.summary}</span>
                      </p>
                      {reason && <p className="mt-1 whitespace-pre-line border-l-2 border-border pl-2 text-muted">{reason}</p>}
                      <p className="font-mono text-xs text-subtle">{dateTimeFormat.format(entry.createdAt)}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          {edits.length > 0 && (
            <Panel title="Recent changes by them">
              <ol className="grid gap-3 px-5 py-4">
                {edits.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p className="leading-snug text-muted">
                      {entry.summary}
                      {entry.listSlug && <span className="ml-2 font-mono text-xs text-subtle">/{entry.listSlug}</span>}
                    </p>
                    <p className="font-mono text-xs text-subtle">{dateTimeFormat.format(entry.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </aside>
      </div>
    </section>
  );
}
