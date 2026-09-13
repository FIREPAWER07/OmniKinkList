import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hasUnpublishedChanges, loadDraft, pendingChanges } from "@/db/content";
import { auditLog, categories, lists, listVersions, suggestions, user } from "@/db/schema";

export async function getUsers() {
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: user.twoFactorEnabled, createdAt: user.createdAt })
    .from(user)
    .orderBy(asc(user.createdAt));
}

export async function getAuditLog(limit = 100) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(limit);
}

export type AuditEntry = Awaited<ReturnType<typeof getAuditLog>>[number];

export async function getDraftOverview() {
  const rows = await db.select().from(lists).orderBy(asc(lists.sortOrder), asc(lists.name));
  return Promise.all(
    rows.map(async (list) => {
      const [draft, latest, unpublished] = await Promise.all([
        loadDraft(list.slug),
        db.select({ version: listVersions.version, publishedAt: listVersions.publishedAt }).from(listVersions).where(eq(listVersions.listSlug, list.slug)).orderBy(desc(listVersions.version)).limit(1),
        hasUnpublishedChanges(list.slug),
      ]);
      const itemCount = draft?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0;
      return {
        slug: list.slug,
        name: list.name,
        categoryCount: draft?.categories.length ?? 0,
        itemCount,
        version: latest[0]?.version ?? null,
        publishedAt: latest[0]?.publishedAt ?? null,
        unpublished,
      };
    }),
  );
}

export async function getEditorList(slug: string) {
  const [draft, changes, allCategories] = await Promise.all([
    loadDraft(slug),
    pendingChanges(slug),
    db
      .select({ id: categories.id, name: categories.name, listSlug: categories.listSlug, listName: lists.name })
      .from(categories)
      .innerJoin(lists, eq(lists.slug, categories.listSlug))
      .orderBy(asc(lists.sortOrder), asc(categories.sortOrder)),
  ]);
  return draft ? { draft, changes, allCategories } : null;
}

export async function getVersions(slug: string) {
  return db
    .select({
      version: listVersions.version,
      note: listVersions.note,
      changes: listVersions.changes,
      publishedByName: listVersions.publishedByName,
      publishedAt: listVersions.publishedAt,
    })
    .from(listVersions)
    .where(eq(listVersions.listSlug, slug))
    .orderBy(desc(listVersions.version));
}

export async function getSuggestions(status: "pending" | "accepted" | "rejected" = "pending") {
  return db.select().from(suggestions).where(eq(suggestions.status, status)).orderBy(desc(suggestions.createdAt)).limit(200);
}

export async function countPendingSuggestions() {
  const [row] = await db.select({ value: count() }).from(suggestions).where(and(eq(suggestions.status, "pending")));
  return row?.value ?? 0;
}
