import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { SuggestionReview } from "@/components/admin/suggestion-review";
import { db } from "@/db";
import { categories, lists } from "@/db/schema";
import { getSuggestions } from "@/lib/admin/queries";
import { requirePageRole } from "@/lib/session";

export default function SuggestionsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Suggestions />
    </Suspense>
  );
}

async function Suggestions() {
  await requirePageRole("trusted", "/admin/suggestions");
  const [pending, allCategories] = await Promise.all([
    getSuggestions("pending"),
    db
      .select({ id: categories.id, name: categories.name, listSlug: categories.listSlug, listName: lists.name })
      .from(categories)
      .innerJoin(lists, eq(lists.slug, categories.listSlug))
      .orderBy(asc(lists.sortOrder), asc(categories.sortOrder)),
  ]);
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Suggestions</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Items visitors suggested. Accepting adds the item to the draft, where you can adjust it before publishing.
      </p>
      <SuggestionReview
        suggestions={pending.map((s) => ({
          ...s,
          roles: JSON.parse(s.roles) as string[],
          variants: JSON.parse(s.variants) as string[],
          createdAt: s.createdAt.toISOString(),
        }))}
        categories={allCategories}
      />
    </section>
  );
}
