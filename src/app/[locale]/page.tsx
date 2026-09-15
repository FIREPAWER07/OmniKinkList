import { ArrowsLeftRightIcon, DownloadSimpleIcon, LinkSimpleIcon, UsersIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { DemoCard } from "@/components/home/demo-card";
import { LevelGuide } from "@/components/home/level-guide";
import { ListRow } from "@/components/home/list-row";
import { buttonClass } from "@/components/ui/button";
import { localePath } from "@/i18n/config";
import { getLocale, getTranslator } from "@/i18n/server";
import { getPublishedLists, summarize } from "@/lib/kinks/data";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getTranslator(locale);
  const lists = await getPublishedLists(locale);
  const summaries = lists.map(summarize);
  const demoItem =
    lists.flatMap((l) => l.categories.flatMap((c) => c.items)).find((i) => i.options.some((o) => o.kind === "role") && i.options.length >= 4) ??
    lists[0]?.categories[0]?.items[0];

  const features = [
    { Icon: LinkSimpleIcon, title: t("home.featureShareTitle"), body: t("home.featureShareBody") },
    { Icon: ArrowsLeftRightIcon, title: t("home.featureCompareTitle"), body: t("home.featureCompareBody") },
    { Icon: UsersIcon, title: t("home.featureProfilesTitle"), body: t("home.featureProfilesBody") },
    { Icon: DownloadSimpleIcon, title: t("home.featureKeepTitle"), body: t("home.featureKeepBody") },
  ];

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {t("home.titleBefore")} <span className="text-accent">{t("home.titleHighlight")}</span> {t("home.titleAfter")}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{t("home.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#lists" className={buttonClass("primary", "lg")}>
              {t("home.pickList")}
            </Link>
            <Link href={localePath(locale, "/import")} className={buttonClass("secondary", "lg")}>
              {t("home.importSaved")}
            </Link>
          </div>
        </div>
        {demoItem && <DemoCard item={demoItem} />}
      </section>

      <section id="lists" className="mx-auto max-w-7xl scroll-mt-20 px-4 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("home.listsTitle")}</h2>
        <p className="mt-2 max-w-xl text-muted">{t("home.listsSubtitle")}</p>
        {summaries.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-muted">{t("home.noLists")}</div>
        ) : (
          <div className="mt-8 grid gap-3">
            {summaries.map((summary, index) => (
              <ListRow key={summary.slug} summary={summary} featured={index === summaries.length - 1} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-24 grid max-w-7xl gap-12 px-4 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("home.answersTitle")}</h2>
          <p className="mt-3 max-w-md leading-relaxed text-muted">{t("home.answersBody")}</p>
        </div>
        <LevelGuide />
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("home.privateTitle")}</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-muted">{t("home.privateBody")}</p>
        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {features.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
