import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DemoCard } from "@/components/home/demo-card";
import { ListRow } from "@/components/home/list-row";
import { LevelGuide } from "@/components/home/level-guide";
import { getAllLists, getListSummaries } from "@/lib/kinks/data";

export default async function HomePage() {
  const [summaries, lists] = await Promise.all([getListSummaries(), getAllLists()]);
  const demoItem =
    lists.flatMap((l) => l.categories.flatMap((c) => c.items)).find((i) => i.name === "Spanking" && i.options.length >= 3) ??
    lists[0]?.categories[0]?.items[0];

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Find out what you are <span className="text-accent">really</span> into.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Rate kinks from favorite to dislike, get a clear overview, and share it with a private link.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#lists" className={buttonClass("primary", "lg")}>
              Pick a list
            </Link>
            <Link href="/import" className={buttonClass("secondary", "lg")}>
              Import a saved list
            </Link>
          </div>
        </div>
        {demoItem && <DemoCard item={demoItem} />}
      </section>

      <section id="lists" className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Choose how deep you want to go</h2>
        <p className="mt-2 max-w-xl text-muted">
          Start small and move up later. Each list keeps its own answers.
        </p>
        {summaries.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-muted">
            No lists yet. Run <code className="font-mono text-fg">bun run db:setup</code> to seed the database.
          </div>
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
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Five answers, no pressure</h2>
          <p className="mt-3 max-w-md leading-relaxed text-muted">
            Every item and every role gets its own answer. Skip anything you want. Nothing is saved on our servers:
            your answers live in this browser until you export or share them.
          </p>
          <ul className="mt-6 grid max-w-md gap-3 text-sm">
            <li className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">Share with a link</p>
              <p className="mt-1 text-muted">Your answers are packed into the link itself, so only people you send it to can see them.</p>
            </li>
            <li className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">Keep a copy</p>
              <p className="mt-1 text-muted">Export a standalone HTML file and import it later to keep editing, even from the old site.</p>
            </li>
          </ul>
        </div>
        <LevelGuide />
      </section>
    </>
  );
}
