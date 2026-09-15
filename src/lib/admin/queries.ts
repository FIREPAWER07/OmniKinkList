import "server-only";
import { and, asc, count, desc, eq, gt, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { hasUnpublishedChanges, loadDraftAndLatest, pendingChanges } from "@/db/content";
import { account, auditLog, categories, lists, listVersions, session, suggestions, user, userVaults } from "@/db/schema";

export const USER_FILTERS = ["all", "new", "staff", "banned", "unverified"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export const USERS_PAGE_SIZE = 50;

const activeBan = sql`(${user.banned} and (${user.banExpires} is null or ${user.banExpires} > now()))`;
const joinedThisWeek = sql`${user.createdAt} > now() - interval '7 days'`;

const USER_FILTER_CONDITIONS: Record<UserFilter, SQL | undefined> = {
  all: undefined,
  new: joinedThisWeek,
  staff: ne(user.role, "user"),
  banned: activeBan,
  unverified: eq(user.emailVerified, false),
};

const countWhere = (condition: SQL) => sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

export async function getUserStats() {
  const [row] = await db
    .select({
      all: count(),
      new: countWhere(joinedThisWeek),
      staff: countWhere(sql`${user.role} <> 'user'`),
      banned: countWhere(activeBan),
      unverified: countWhere(sql`not ${user.emailVerified}`),
    })
    .from(user);
  return row satisfies Record<UserFilter, number>;
}

/** One page of accounts, newest first. `query` matches part of the name or email, or the exact id. */
export async function searchUsers({ query, filter, page }: { query: string; filter: UserFilter; page: number }) {
  const q = query.trim();
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const where = and(q ? or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.username, pattern), eq(user.id, q)) : undefined, USER_FILTER_CONDITIONS[filter]);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        banned: user.banned,
        banExpires: user.banExpires,
        createdAt: user.createdAt,
        // Spelled out: Drizzle leaves column names unqualified in single-table selects, which would be ambiguous here.
        lastActiveAt: sql<Date | null>`(select max("session"."updated_at") from "session" where "session"."user_id" = "user"."id")`.mapWith(session.updatedAt),
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt), asc(user.id))
      .limit(USERS_PAGE_SIZE)
      .offset((page - 1) * USERS_PAGE_SIZE),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return { rows, total };
}

/**
 * Everything an admin needs to check an account. Synced answers are private: only whether they exist, their size, and
 * whether they are encrypted are loaded, never their content.
 */
export async function getUserDetail(id: string) {
  const [profile] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      locale: user.locale,
      username: user.username,
      profilePublic: user.profilePublic,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, id));
  if (!profile) return null;

  const [accounts, sessions, [vault], recentSuggestions, suggestionCounts, moderation, edits] = await Promise.all([
    db.select({ providerId: account.providerId, createdAt: account.createdAt }).from(account).where(eq(account.userId, id)).orderBy(asc(account.createdAt)),
    db
      .select({ id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt, expiresAt: session.expiresAt, ipAddress: session.ipAddress, userAgent: session.userAgent })
      .from(session)
      .where(and(eq(session.userId, id), gt(session.expiresAt, new Date())))
      .orderBy(desc(session.updatedAt)),
    db
      .select({
        encrypted: sql<boolean>`${userVaults.ciphertext} is not null`,
        bytes: sql<number>`octet_length(coalesce(${userVaults.data}, ${userVaults.ciphertext}))`.mapWith(Number),
        version: userVaults.version,
        updatedAt: userVaults.updatedAt,
      })
      .from(userVaults)
      .where(eq(userVaults.userId, id)),
    db
      .select({ id: suggestions.id, listSlug: suggestions.listSlug, name: suggestions.name, status: suggestions.status, createdAt: suggestions.createdAt })
      .from(suggestions)
      .where(eq(suggestions.submitterId, id))
      .orderBy(desc(suggestions.createdAt))
      .limit(20),
    db.select({ status: suggestions.status, value: count() }).from(suggestions).where(eq(suggestions.submitterId, id)).groupBy(suggestions.status),
    db
      .select({ id: auditLog.id, userName: auditLog.userName, action: auditLog.action, summary: auditLog.summary, after: auditLog.after, createdAt: auditLog.createdAt })
      .from(auditLog)
      .where(and(eq(auditLog.entityId, id), inArray(auditLog.entityType, ["user", "role"])))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(50),
    db
      .select({ id: auditLog.id, summary: auditLog.summary, listSlug: auditLog.listSlug, createdAt: auditLog.createdAt })
      .from(auditLog)
      .where(eq(auditLog.userId, id))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(10),
  ]);

  const suggestionTotals = { pending: 0, accepted: 0, rejected: 0 };
  for (const row of suggestionCounts) suggestionTotals[row.status] = row.value;

  return { profile, accounts, sessions, vault: vault ?? null, recentSuggestions, suggestionTotals, moderation, edits };
}

/** The latest activity, serialized for the client. Snapshots are left out; only whether a change can be undone is sent. */
export async function getAuditLog(limit = 100) {
  const rows = await db
    .select({
      id: auditLog.id,
      userName: auditLog.userName,
      summary: auditLog.summary,
      action: auditLog.action,
      listSlug: auditLog.listSlug,
      entityType: auditLog.entityType,
      hasBefore: sql<boolean>`${auditLog.before} is not null`,
      revertedAt: auditLog.revertedAt,
      revertedByName: auditLog.revertedByName,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), revertedAt: row.revertedAt?.toISOString() ?? null }));
}

export async function getDraftOverview() {
  const rows = await db.select({ slug: lists.slug, name: lists.name }).from(lists).orderBy(asc(lists.sortOrder), asc(lists.name));
  return Promise.all(
    rows.map(async (list) => {
      const { draft, latest } = await loadDraftAndLatest(list.slug);
      return {
        slug: list.slug,
        name: list.name,
        categoryCount: draft?.categories.length ?? 0,
        itemCount: draft?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0,
        version: latest?.version ?? null,
        publishedAt: latest?.publishedAt ?? null,
        unpublished: !!draft && hasUnpublishedChanges(draft, latest),
      };
    }),
  );
}

/** Every category of every list, for pickers that move or add items. */
export async function getAllCategories() {
  return db
    .select({ id: categories.id, name: categories.name, listSlug: categories.listSlug, listName: lists.name })
    .from(categories)
    .innerJoin(lists, eq(lists.slug, categories.listSlug))
    .orderBy(asc(lists.sortOrder), asc(categories.sortOrder));
}

export async function getEditorList(slug: string) {
  const [{ draft, latest }, allCategories] = await Promise.all([loadDraftAndLatest(slug), getAllCategories()]);
  return draft ? { draft, changes: pendingChanges(draft, latest), allCategories } : null;
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
  const [row] = await db.select({ value: count() }).from(suggestions).where(eq(suggestions.status, "pending"));
  return row?.value ?? 0;
}
