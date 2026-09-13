"use client";

import { ChatsCircleIcon, HandshakeIcon, SparkleIcon, WarningIcon, type Icon } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { BUCKET_ORDER, compareAnswers, type CompareBucket, type CompareItem } from "@/lib/kinks/compare";
import { decodeShareInput } from "@/lib/kinks/share";
import { DEFAULT_PROFILE_ID, listStore, useHydrated, useProfiles } from "@/lib/kinks/store";
import type { KinkList, ListData } from "@/lib/kinks/types";
import { ExperienceChip } from "./answer-summary";
import { LevelChip } from "./level";

const BUCKET_ICONS: Record<CompareBucket, Icon> = {
  match: HandshakeIcon,
  curious: SparkleIcon,
  talk: ChatsCircleIcon,
  conflict: WarningIcon,
};

type SourceState = { mode: "profile"; profileId: string } | { mode: "link"; text: string };

interface ResolvedSource {
  slug: string | null;
  name: string;
  data: ListData | null;
  error?: "invalidLink";
}

export function CompareView({ lists }: { lists: KinkList[] }) {
  return (
    <Suspense>
      <CompareInner lists={lists} />
    </Suspense>
  );
}

function CompareInner({ lists }: { lists: KinkList[] }) {
  const t = useT();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const profiles = useProfiles();
  const [slug, setSlug] = useState(() => params.get("list") ?? lists[0]?.slug ?? "");
  const [sourceA, setSourceA] = useState<SourceState>({ mode: "profile", profileId: profiles.active });
  const [sourceB, setSourceB] = useState<SourceState>({ mode: "link", text: "" });

  const profileName = (id: string) => {
    const profile = profiles.profiles.find((p) => p.id === id);
    return profile?.name || (id === DEFAULT_PROFILE_ID ? t("profiles.me") : t("profiles.unnamed"));
  };

  const resolve = (source: SourceState, fallbackName: string): ResolvedSource => {
    if (source.mode === "profile") {
      return { slug: null, name: profileName(source.profileId), data: hydrated ? listStore.get(slug, source.profileId) : null };
    }
    if (!source.text.trim()) return { slug: null, name: fallbackName, data: null };
    const shared = decodeShareInput(source.text);
    if (!shared) return { slug: null, name: fallbackName, data: null, error: "invalidLink" };
    return { slug: shared.slug, name: shared.name || fallbackName, data: shared.data };
  };

  const a = resolve(sourceA, t("compare.personA"));
  const b = resolve(sourceB, t("compare.personB"));
  const linkSlugs = [a.slug, b.slug].filter((s): s is string => !!s);
  const effectiveSlug = linkSlugs[0] ?? slug;
  const mismatch = linkSlugs.length === 2 && linkSlugs[0] !== linkSlugs[1];
  const list = lists.find((l) => l.slug === effectiveSlug);

  const aData = sourceA.mode === "profile" && hydrated ? listStore.get(effectiveSlug, sourceA.profileId) : a.data;
  const bData = sourceB.mode === "profile" && hydrated ? listStore.get(effectiveSlug, sourceB.profileId) : b.data;

  const results = useMemo(() => (list && aData && bData && !mismatch ? compareAnswers(list, aData, bData) : null), [list, aData, bData, mismatch]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("compare.title")}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t("compare.subtitle")}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <SourcePicker label={t("compare.personA")} state={sourceA} onChange={setSourceA} profiles={profiles.profiles.map((p) => ({ id: p.id, name: profileName(p.id) }))} error={a.error} />
        <SourcePicker label={t("compare.personB")} state={sourceB} onChange={setSourceB} profiles={profiles.profiles.map((p) => ({ id: p.id, name: profileName(p.id) }))} error={b.error} />
      </div>

      {linkSlugs.length === 0 && (
        <Field label={t("compare.list")} htmlFor="compare-list" className="mt-4 max-w-xs">
          <Select id="compare-list" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {lists.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {mismatch && <p className="mt-6 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{t("compare.mismatch")}</p>}

      {!results ? (
        !mismatch && <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted">{t("compare.waiting")}</p>
      ) : (
        <CompareResults results={results} nameA={a.name} nameB={b.name} />
      )}
    </div>
  );
}

function SourcePicker({
  label,
  state,
  onChange,
  profiles,
  error,
}: {
  label: string;
  state: SourceState;
  onChange: (state: SourceState) => void;
  profiles: { id: string; name: string }[];
  error?: string;
}) {
  const t = useT();
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className="grid content-start gap-3 rounded-xl border border-border bg-surface p-4">
      <p className="font-medium">{label}</p>
      <Select
        aria-label={t("compare.source")}
        value={state.mode === "profile" ? `profile:${state.profileId}` : "link"}
        onChange={(e) => {
          const value = e.target.value;
          onChange(value === "link" ? { mode: "link", text: "" } : { mode: "profile", profileId: value.slice(8) });
        }}
      >
        {profiles.map((p) => (
          <option key={p.id} value={`profile:${p.id}`}>
            {t("compare.fromProfile", { name: p.name })}
          </option>
        ))}
        <option value="link">{t("compare.fromLink")}</option>
      </Select>
      {state.mode === "link" && (
        <Field label={t("compare.linkLabel")} htmlFor={`${id}-link`} error={error ? t("compare.invalidLink") : null}>
          <Textarea id={`${id}-link`} value={state.text} onChange={(e) => onChange({ mode: "link", text: e.target.value })} rows={2} className="font-mono text-xs" placeholder="https://…/s#…" />
        </Field>
      )}
    </div>
  );
}

function CompareResults({ results, nameA, nameB }: { results: CompareItem[]; nameA: string; nameB: string }) {
  const t = useT();
  const counts = Object.fromEntries(BUCKET_ORDER.map((b) => [b, results.filter((r) => r.bucket === b).length])) as Record<CompareBucket, number>;
  const [active, setActive] = useState<CompareBucket>(() => BUCKET_ORDER.find((b) => counts[b] > 0) ?? "match");
  const shown = results.filter((r) => r.bucket === active);

  return (
    <section className="mt-10">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist">
        {BUCKET_ORDER.map((bucket) => {
          const Icon = BUCKET_ICONS[bucket];
          return (
            <button
              key={bucket}
              type="button"
              role="tab"
              aria-selected={active === bucket}
              onClick={() => setActive(bucket)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                active === bucket ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <span className={cn("flex items-center gap-2 text-sm font-medium", active === bucket ? "text-accent" : "text-fg")}>
                <Icon size={16} aria-hidden /> {t(`compare.buckets.${bucket}`)}
              </span>
              <span className="mt-1 block font-mono text-2xl tabular-nums">{counts[bucket]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted">{t(`compare.bucketHints.${active}`)}</p>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted">{t("compare.emptyBucket")}</p>
      ) : (
        <div className="mt-6 gap-3 md:columns-2">
          {shown.map(({ item, category, rows, rolePairs }) => (
            <article key={item.id} className="mb-3 break-inside-avoid rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-subtle">{category}</p>
              <h3 className="font-medium">{item.name}</h3>
              {rolePairs.length > 0 && (
                <p className="mt-1 text-sm text-accent">
                  {rolePairs.slice(0, 3).map(([x, y]) => t("compare.pair", { a: nameA, roleA: x, b: nameB, roleB: y })).join(" · ")}
                </p>
              )}
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-subtle">
                    <th className="pb-1 font-normal" />
                    <th className="truncate pb-1 font-normal">{nameA}</th>
                    <th className="truncate pb-1 font-normal">{nameB}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-t border-border">
                      <td className="py-1.5 pr-2 text-muted">{row.label ?? t("results.overall")}</td>
                      {[row.a, row.b].map((side, i) => (
                        <td key={i} className="py-1.5 pr-2">
                          <span className="flex flex-wrap items-center gap-1">
                            {side.level ? <LevelChip level={side.level} /> : <span className="text-subtle">-</span>}
                            {side.experience && <ExperienceChip value={side.experience} />}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
