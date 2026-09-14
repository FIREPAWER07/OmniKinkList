import { CalendarBlankIcon, LightbulbIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProfileOwnerBar } from "@/components/profile/owner-bar";
import { getLocale, getT } from "@/i18n/server";
import { getProfile } from "@/lib/account/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/u/[username]">): Promise<Metadata> {
  const [{ username }, t] = await Promise.all([params, getT()]);
  const profile = await getProfile(username);
  return {
    title: profile ? t("userProfile.title", { name: profile.name, username: profile.username }) : t("notFound.title"),
    // Profiles are shared by link only, never listed in search engines.
    robots: { index: false, follow: false },
  };
}

export default function UserProfilePage({ params }: PageProps<"/[locale]/u/[username]">) {
  return (
    <Suspense fallback={<div aria-busy className="mx-auto h-64 max-w-2xl animate-pulse px-4 pt-10" />}>
      <UserProfile params={params} />
    </Suspense>
  );
}

async function UserProfile({ params }: Pick<PageProps<"/[locale]/u/[username]">, "params">) {
  const [{ username }, locale, t] = await Promise.all([params, getLocale(), getT()]);
  const profile = await getProfile(username);
  if (!profile) notFound();

  const joined = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(profile.createdAt);
  const initial = (Array.from(profile.name.trim())[0] ?? profile.username.charAt(0)).toUpperCase();
  const badge = profile.role === "admin" ? t("userProfile.admin") : profile.role === "trusted" ? t("userProfile.editor") : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 lg:px-8">
      {profile.isOwner && <ProfileOwnerBar profilePublic={profile.profilePublic} />}

      <header className="flex items-center gap-5">
        <span aria-hidden className="grid size-20 shrink-0 place-items-center rounded-full border border-border bg-accent-soft text-3xl font-semibold text-accent">
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl font-semibold tracking-tight">
            <span className="break-words">{profile.name}</span>
            {badge && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium tracking-normal text-accent">{badge}</span>}
          </h1>
          <p className="mt-1 break-all font-mono text-sm text-muted">@{profile.username}</p>
        </div>
      </header>

      {profile.bio ? (
        <p className="mt-8 whitespace-pre-line break-words leading-relaxed">{profile.bio}</p>
      ) : (
        profile.isOwner && <p className="mt-8 text-sm text-subtle">{t("userProfile.emptyBio")}</p>
      )}

      <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-muted">
        <li className="flex items-center gap-2">
          <CalendarBlankIcon size={16} aria-hidden /> {t("userProfile.joined", { date: joined })}
        </li>
        {profile.acceptedSuggestions > 0 && (
          <li className="flex items-center gap-2">
            <LightbulbIcon size={16} aria-hidden /> {t("userProfile.suggestions", { count: profile.acceptedSuggestions })}
          </li>
        )}
      </ul>
    </div>
  );
}
