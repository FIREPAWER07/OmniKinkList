"use client";

import { WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { useHref, useT } from "@/i18n/client";
import { getAccountInfo } from "@/lib/account/actions";
import { useSession } from "@/lib/auth-client";
import { DangerZone, PasswordSection, ProfileSection } from "./profile-sections";
import { SyncSection } from "./sync-section";
import { TwoFactorSection } from "./two-factor-section";

export function Section({ id, title, description, children }: { id?: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-20 gap-6 border-t border-border py-8 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function AccountView() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending, refetch } = useSession();
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getAccountInfo>>>(null);

  const userId = session?.user.id;

  useEffect(() => {
    if (!isPending && !userId) router.replace(`${href("/login")}?next=${encodeURIComponent(href("/account"))}`);
  }, [userId, isPending, router, href]);

  // Keyed on the user only: re-running on anything else during a link click (to the profile page, say) would call this
  // action from a page that doesn't include it.
  useEffect(() => {
    if (userId) getAccountInfo().then(setInfo);
  }, [userId]);

  if (!session || !info) return <div aria-busy className="mx-auto h-96 max-w-4xl animate-pulse px-4 pt-10" />;

  const next = params.get("next");
  const reload = async () => {
    await refetch();
    setInfo(await getAccountInfo());
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("account.title")}</h1>
      <p className="mt-2 text-muted">{t("account.subtitle")}</p>

      {params.get("require2fa") && !session.user.twoFactorEnabled && (
        <p className="mt-6 flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <WarningIcon size={18} className="shrink-0 text-warning" aria-hidden /> {t("account.require2fa")}
        </p>
      )}
      {next?.startsWith("/admin") && session.user.twoFactorEnabled && (
        <Link href={next} className={buttonClass("primary", "md", "mt-6")}>
          {t("account.continueToEditor")}
        </Link>
      )}

      <div className="mt-8">
        <ProfileSection user={session.user} onChange={reload} />
        <SyncSection />
        <TwoFactorSection method={info.twoFactorMethod} email={session.user.email} hasPassword={info.hasPassword} onChange={reload} />
        <PasswordSection hasPassword={info.hasPassword} providers={info.providers} onChange={reload} />
        <DangerZone hasPassword={info.hasPassword} email={session.user.email} />
      </div>
    </div>
  );
}
