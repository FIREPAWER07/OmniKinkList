"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewSuggestion } from "@/lib/admin/actions";
import { ItemDialog, type CategoryChoice } from "./item-dialog";

interface Suggestion {
  id: number;
  listSlug: string;
  categoryId: number | null;
  name: string;
  description: string;
  roles: string[];
  variants: string[];
  comment: string;
  locale: string;
  createdAt: string;
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function SuggestionReview({ suggestions, categories }: { suggestions: Suggestion[]; categories: CategoryChoice[] }) {
  const [accepting, setAccepting] = useState<Suggestion | null>(null);
  const [pending, startTransition] = useTransition();

  if (suggestions.length === 0) return <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted">No suggestions waiting.</p>;

  const defaultCategory = (s: Suggestion) =>
    s.categoryId && categories.some((c) => c.id === s.categoryId) ? s.categoryId : (categories.find((c) => c.listSlug === s.listSlug)?.id ?? categories[0]?.id ?? 0);

  return (
    <>
      <ul className="mt-6 grid gap-3">
        {suggestions.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-subtle">
                  {categories.find((c) => c.listSlug === s.listSlug)?.listName ?? s.listSlug}
                  {s.categoryId && `, ${categories.find((c) => c.id === s.categoryId)?.name ?? "unknown category"}`} · {dateFormat.format(new Date(s.createdAt))} ·{" "}
                  {s.locale.toUpperCase()}
                </p>
                <p className="mt-1 font-medium">{s.name}</p>
                {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                {(s.roles.length > 0 || s.variants.length > 0) && (
                  <p className="mt-2 text-sm text-muted">
                    {s.roles.length > 0 && `Roles: ${s.roles.join(", ")}. `}
                    {s.variants.length > 0 && `Variations: ${s.variants.join(", ")}.`}
                  </p>
                )}
                {s.comment && <p className="mt-2 border-l-2 border-accent pl-3 text-sm">{s.comment}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await reviewSuggestion(s.id, false);
                      if (result.ok) toast.success("Suggestion rejected");
                      else toast.error(result.error);
                    })
                  }
                >
                  Reject
                </Button>
                <Button size="sm" variant="primary" onClick={() => setAccepting(s)}>
                  Review and add
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {accepting && (
        <ItemDialog
          open
          onClose={() => setAccepting(null)}
          title="Add suggested item"
          categories={categories}
          categoryId={defaultCategory(accepting)}
          initial={{
            name: accepting.name,
            description: accepting.description,
            options: [...accepting.roles.map((label) => ({ label, kind: "role" as const })), ...accepting.variants.map((label) => ({ label, kind: "variant" as const }))],
          }}
          onSubmitOverride={(input) => reviewSuggestion(accepting.id, true, input)}
        />
      )}
    </>
  );
}
