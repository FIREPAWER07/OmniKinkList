"use client";

import { useCallback, useState } from "react";
import { ItemCard, itemAnswerSignature } from "@/components/kinks/item-card";
import type { Answers, KinkItem, Level } from "@/lib/kinks/types";

/** A real, interactive item card. Answers here are not saved. */
export function DemoCard({ item }: { item: KinkItem }) {
  const shown: KinkItem = { ...item, options: item.options.slice(0, 4) };
  const [answers, setAnswers] = useState<Answers>(() => {
    const initial: Answers = {};
    const preset: Level[] = ["favorite", "like", "maybe"];
    shown.options.slice(0, 3).forEach((o, i) => (initial[`o${o.id}`] = preset[i]));
    return initial;
  });

  const onRate = useCallback((key: string, level: Level | null) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (level) next[key] = level;
      else delete next[key];
      return next;
    });
  }, []);

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[2rem] bg-accent-soft/60 blur-2xl" />
      <div className="rotate-[-1.5deg] rounded-xl border border-border bg-surface-2 p-2 shadow-2xl shadow-black/20 transition-transform duration-300 hover:rotate-0">
        <ItemCard item={shown} signature={itemAnswerSignature(shown, answers)} onRate={onRate} className="border-transparent" />
      </div>
      <p className="mt-4 text-center text-xs text-subtle">Try it. This preview is not saved.</p>
    </div>
  );
}
