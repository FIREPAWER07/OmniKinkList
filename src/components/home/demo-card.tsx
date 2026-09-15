"use client";

import { useCallback, useState } from "react";
import { ItemCard } from "@/components/kinks/item-card";
import { useT } from "@/i18n/client";
import { optionKey } from "@/lib/kinks/choices";
import { emptyListData, setKey } from "@/lib/kinks/list-data";
import type { Experience, KinkItem, Level } from "@/lib/kinks/types";

/** A real, interactive item card. Answers here are not saved. */
export function DemoCard({ item }: { item: KinkItem }) {
  const t = useT();
  const [shown] = useState<KinkItem>(() => ({ ...item, options: item.options.slice(0, 4), addedAt: undefined }));
  const [data, setData] = useState(() => {
    const initial = emptyListData();
    const preset: Level[] = ["favorite", "like", "maybe"];
    shown.options.slice(0, 3).forEach((o, i) => (initial.answers[optionKey(shown, o.id)] = preset[i]));
    if (shown.options[1]) initial.experience[optionKey(shown, shown.options[1].id)] = "want";
    return initial;
  });

  const onRate = useCallback((key: string, level: Level | null) => setData((d) => ({ ...d, answers: setKey(d.answers, key, level) })), []);
  const onExperience = useCallback(
    (key: string, value: Experience | null) => setData((d) => ({ ...d, experience: setKey(d.experience, key, value) })),
    [],
  );

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[2rem] bg-accent-soft/60 blur-2xl" />
      <div className="rotate-[-1.5deg] rounded-xl border border-border bg-surface-2 p-2 shadow-2xl shadow-black/20 transition-transform duration-300 hover:rotate-0">
        <ItemCard item={shown} data={data} onRate={onRate} onExperience={onExperience} className="border-transparent" />
      </div>
      <p className="mt-4 text-center text-xs text-subtle">{t("home.demoHint")}</p>
    </div>
  );
}
