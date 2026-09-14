"use server";

import { and, eq, inArray, max, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { loadLatestVersion, publishList as publishDraft } from "@/db/content";
import { auditLog, categories, contentTranslations, items, lists, listVersions, options, session, suggestions, user } from "@/db/schema";
import { LISTS_TAG } from "@/lib/kinks/data";
import type { PublishedData } from "@/lib/kinks/published";
import { BAN_DURATION_LABELS, banExpiry, isBanActive } from "@/lib/moderation";
import { consumeRateLimit, RateLimitError } from "@/lib/rate-limit";
import type { Role } from "@/lib/roles";
import { AuthorizationError, requireActionRole, type CurrentUser } from "@/lib/session";
import {
  deleteCategoryCompletely,
  deleteItemCompletely,
  restoreCategory,
  restoreCategoryTree,
  restoreItem,
  RestoreError,
  restoreList,
  restoreOrder,
  restoreRole,
  restoreTranslation,
  snapshotCategory,
  snapshotCategoryTree,
  snapshotItem,
  snapshotList,
  snapshotOrder,
  snapshotTranslation,
  type EntityType,
} from "./snapshots";
import {
  banInput,
  categoryInput,
  firstIssue,
  itemInput,
  listInput,
  reorderInput,
  roleInput,
  slugSchema,
  translationInput,
  type BanInput,
  type CategoryInput,
  type ItemInput,
  type ListInput,
  type TranslationInput,
} from "./validation";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

class ModerationError extends Error {}

/** Role check, editor rate limit, and turning known failures into results instead of thrown errors. */
async function run<T>(minimum: Role, mutate: (actor: CurrentUser) => Promise<ActionResult<T> | void>): Promise<ActionResult<T>> {
  try {
    const actor = await requireActionRole(minimum);
    await consumeRateLimit(`editor:${actor.id}`, 180, 60);
    const result = (await mutate(actor)) ?? { ok: true as const };
    revalidatePath("/[locale]/admin", "layout");
    return result;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof RestoreError || error instanceof ModerationError) return { ok: false, error: error.message };
    if (error instanceof RateLimitError) return { ok: false, error: "You are making changes very fast. Wait a minute and try again." };
    console.error(error);
    return { ok: false, error: "Something went wrong while saving. Try again." };
  }
}

async function log(
  actor: CurrentUser,
  action: string,
  summary: string,
  listSlug: string | null,
  change?: { entityType: EntityType; entityId: string | number; before: unknown; after: unknown },
) {
  await db.insert(auditLog).values({
    userId: actor.id,
    userName: actor.name,
    action,
    summary,
    listSlug,
    entityType: change?.entityType ?? null,
    entityId: change ? String(change.entityId) : null,
    before: change ? JSON.stringify(change.before) : null,
    after: change ? JSON.stringify(change.after) : null,
  });
}

async function categoryContext(categoryId: number) {
  const [row] = await db
    .select({ id: categories.id, name: categories.name, listSlug: categories.listSlug })
    .from(categories)
    .where(eq(categories.id, categoryId));
  return row ?? null;
}

/* ------------------------------ Lists ------------------------------ */

export async function createList(input: ListInput) {
  return run("admin", async (actor) => {
    const parsed = listInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const [existing] = await db.select({ slug: lists.slug }).from(lists).where(eq(lists.slug, parsed.data.slug));
    if (existing) return { ok: false, error: "A list with that slug already exists." };
    const [{ value: last }] = await db.select({ value: max(lists.sortOrder) }).from(lists);
    await db.insert(lists).values({ ...parsed.data, sortOrder: (last ?? -1) + 1 });
    await log(actor, "create", `Created list "${parsed.data.name}" (not published yet)`, parsed.data.slug);
  });
}

export async function updateList(input: ListInput) {
  return run("trusted", async (actor) => {
    const parsed = listInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { slug, ...fields } = parsed.data;
    const before = await snapshotList(slug);
    if (!before) return { ok: false, error: "That list no longer exists." };
    await db.update(lists).set(fields).where(eq(lists.slug, slug));
    await log(actor, "update", `Updated details of list "${fields.name}"`, slug, { entityType: "list", entityId: slug, before, after: await snapshotList(slug) });
  });
}

export async function deleteList(slug: string) {
  return run("admin", async (actor) => {
    const [row] = await db.select({ name: lists.name }).from(lists).where(eq(lists.slug, slug));
    if (!row) return { ok: false, error: "That list no longer exists." };
    const categoryRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.listSlug, slug));
    for (const category of categoryRows) await deleteCategoryCompletely(category.id);
    await db.delete(contentTranslations).where(eq(contentTranslations.entityKey, `l:${slug}`));
    await db.delete(lists).where(eq(lists.slug, slug));
    await log(actor, "delete", `Deleted list "${row.name}" and its published versions`, slug);
    updateTag(LISTS_TAG);
  });
}

export async function publishList(slug: string, note: string) {
  return run<{ version: number }>("trusted", async (actor) => {
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) return { ok: false, error: "Unknown list." };
    const result = await publishDraft(parsed.data, actor, note.trim().slice(0, 300));
    if (!result) return { ok: false, error: "There is nothing new to publish." };
    await log(actor, "publish", `Published version ${result.version}${note.trim() ? `: ${note.trim().slice(0, 80)}` : ""}`, slug);
    updateTag(LISTS_TAG);
    return { ok: true, data: { version: result.version } };
  });
}

/** Replaces the draft of a list with a published version (the latest by default). */
export async function restoreVersion(slug: string, version?: number) {
  return run("trusted", async (actor) => {
    const target = version
      ? await db.select().from(listVersions).where(and(eq(listVersions.listSlug, slug), eq(listVersions.version, version))).then((r) => r[0])
      : await loadLatestVersion(slug);
    if (!target) return { ok: false, error: "That version does not exist." };
    const data = JSON.parse(target.data) as PublishedData;

    const categoryRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.listSlug, slug));
    for (const category of categoryRows) await deleteCategoryCompletely(category.id);
    await db.update(lists).set({ name: data.name, tagline: data.tagline, description: data.description }).where(eq(lists.slug, slug));
    await db.delete(contentTranslations).where(eq(contentTranslations.entityKey, `l:${slug}`));

    for (const [ci, category] of data.categories.entries()) {
      await db.insert(categories).values({ id: category.id, listSlug: slug, name: category.name, description: category.description, icon: category.icon, sortOrder: ci });
      for (const [ii, item] of category.items.entries()) {
        await db.insert(items).values({ id: item.id, categoryId: category.id, name: item.name, description: item.description, sortOrder: ii });
        if (item.options.length) {
          await db.insert(options).values(item.options.map((o, oi) => ({ id: o.id, itemId: item.id, label: o.label, kind: o.kind, sortOrder: oi })));
        }
      }
    }
    const translationRows = Object.entries(data.translations ?? {}).flatMap(([locale, entities]) =>
      Object.entries(entities).flatMap(([entityKey, fields]) => Object.entries(fields).map(([field, value]) => ({ locale, entityKey, field, value }))),
    );
    for (let i = 0; i < translationRows.length; i += 200) await db.insert(contentTranslations).values(translationRows.slice(i, i + 200));

    await log(actor, version ? "restore" : "discard", version ? `Restored version ${version} into the draft` : "Discarded unpublished changes", slug);
  });
}

/* ---------------------------- Categories --------------------------- */

export async function saveCategory(input: CategoryInput) {
  return run("trusted", async (actor) => {
    const parsed = categoryInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { id, listSlug, ...fields } = parsed.data;

    if (id) {
      const before = await snapshotCategory(id);
      if (!before || before.listSlug !== listSlug) return { ok: false, error: "That category no longer exists." };
      await db.update(categories).set(fields).where(eq(categories.id, id));
      await log(actor, "update", `Updated category "${fields.name}"`, listSlug, { entityType: "category", entityId: id, before, after: await snapshotCategory(id) });
    } else {
      const [list] = await db.select({ slug: lists.slug }).from(lists).where(eq(lists.slug, listSlug));
      if (!list) return { ok: false, error: "That list no longer exists." };
      const [{ value: last }] = await db.select({ value: max(categories.sortOrder) }).from(categories).where(eq(categories.listSlug, listSlug));
      const [created] = await db.insert(categories).values({ listSlug, ...fields, sortOrder: (last ?? -1) + 1 }).returning({ id: categories.id });
      await log(actor, "create", `Added category "${fields.name}"`, listSlug, { entityType: "category", entityId: created.id, before: null, after: await snapshotCategory(created.id) });
    }
  });
}

export async function deleteCategory(id: number) {
  return run("trusted", async (actor) => {
    const before = await snapshotCategoryTree(id);
    if (!before) return { ok: false, error: "That category no longer exists." };
    await deleteCategoryCompletely(id);
    await log(actor, "delete", `Deleted category "${before.name}" and its ${before.items.length} items`, before.listSlug, {
      entityType: "categoryTree",
      entityId: id,
      before,
      after: null,
    });
  });
}

export async function reorderCategories(listSlug: string, orderedIds: number[]) {
  return run("trusted", async (actor) => {
    const parsed = reorderInput.safeParse(orderedIds);
    if (!parsed.success) return { ok: false, error: "Invalid order." };
    const before = await snapshotOrder("categories", listSlug);
    const known = new Set(before.rows.map((r) => r.id));
    if (parsed.data.length !== known.size || !parsed.data.every((id) => known.has(id))) return { ok: false, error: "The list changed. Reload and try again." };
    for (const [index, id] of parsed.data.entries()) await db.update(categories).set({ sortOrder: index }).where(eq(categories.id, id));
    await log(actor, "move", "Reordered categories", listSlug, { entityType: "order", entityId: listSlug, before, after: await snapshotOrder("categories", listSlug) });
  });
}

/* ------------------------------ Items ------------------------------ */

async function writeItem(parsed: ItemInput) {
  const { id, categoryId, name, description, options: optionInputs } = parsed;
  let itemId = id;
  if (itemId) {
    await db.update(items).set({ name, description, categoryId }).where(eq(items.id, itemId));
  } else {
    const [{ value: last }] = await db.select({ value: max(items.sortOrder) }).from(items).where(eq(items.categoryId, categoryId));
    const [created] = await db.insert(items).values({ categoryId, name, description, sortOrder: (last ?? -1) + 1 }).returning({ id: items.id });
    itemId = created.id;
  }
  // Keep ids of options that still exist so saved answers stay attached to them.
  const current = await db.select({ id: options.id }).from(options).where(eq(options.itemId, itemId));
  const keep = new Set(optionInputs.map((o) => o.id).filter(Boolean));
  const removed = current.filter((o) => !keep.has(o.id)).map((o) => o.id);
  if (removed.length) {
    await db.delete(contentTranslations).where(inArray(contentTranslations.entityKey, removed.map((o) => `o:${o}`)));
    await db.delete(options).where(inArray(options.id, removed));
  }
  for (const [order, option] of optionInputs.entries()) {
    if (option.id && current.some((c) => c.id === option.id)) {
      await db.update(options).set({ label: option.label, kind: option.kind, sortOrder: order }).where(eq(options.id, option.id));
    } else {
      await db.insert(options).values({ itemId, label: option.label, kind: option.kind, sortOrder: order });
    }
  }
  return itemId;
}

export async function saveItem(input: ItemInput) {
  return run<{ id: number }>("trusted", async (actor) => {
    const parsed = itemInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const category = await categoryContext(parsed.data.categoryId);
    if (!category) return { ok: false, error: "That category no longer exists." };
    const before = parsed.data.id ? await snapshotItem(parsed.data.id) : null;
    if (parsed.data.id && !before) return { ok: false, error: "That item no longer exists." };
    const itemId = await writeItem(parsed.data);
    await log(actor, parsed.data.id ? "update" : "create", `${parsed.data.id ? "Updated" : "Added"} item "${parsed.data.name}" in ${category.name}`, category.listSlug, {
      entityType: "item",
      entityId: itemId,
      before,
      after: await snapshotItem(itemId),
    });
    return { ok: true, data: { id: itemId } };
  });
}

/** Copies an item with its options and translations into another category (any list). */
export async function duplicateItem(id: number, targetCategoryId: number) {
  return run("trusted", async (actor) => {
    const source = await snapshotItem(id);
    const target = await categoryContext(targetCategoryId);
    if (!source || !target) return { ok: false, error: "That item or category no longer exists." };
    const newId = await writeItem({
      categoryId: targetCategoryId,
      name: source.name,
      description: source.description,
      options: source.options.map((o) => ({ label: o.label, kind: o.kind })),
    });
    const created = (await snapshotItem(newId))!;
    const optionMap = new Map(source.options.map((o, i) => [`o:${o.id}`, `o:${created.options[i]?.id}`]));
    const copied = source.translations
      .map((row) => ({ ...row, entityKey: row.entityKey === `i:${id}` ? `i:${newId}` : optionMap.get(row.entityKey) ?? "" }))
      .filter((row) => row.entityKey && !row.entityKey.endsWith("undefined"));
    if (copied.length) await db.insert(contentTranslations).values(copied);
    await log(actor, "create", `Copied item "${source.name}" to ${target.name}`, target.listSlug, {
      entityType: "item",
      entityId: newId,
      before: null,
      after: await snapshotItem(newId),
    });
  });
}

export async function deleteItem(id: number) {
  return run("trusted", async (actor) => {
    const before = await snapshotItem(id);
    if (!before) return { ok: false, error: "That item no longer exists." };
    const category = await categoryContext(before.categoryId);
    await deleteItemCompletely(id);
    await log(actor, "delete", `Deleted item "${before.name}"${category ? ` from ${category.name}` : ""}`, category?.listSlug ?? null, {
      entityType: "item",
      entityId: id,
      before,
      after: null,
    });
  });
}

export async function reorderItems(categoryId: number, orderedIds: number[]) {
  return run("trusted", async (actor) => {
    const parsed = reorderInput.safeParse(orderedIds);
    if (!parsed.success) return { ok: false, error: "Invalid order." };
    const category = await categoryContext(categoryId);
    if (!category) return { ok: false, error: "That category no longer exists." };
    const before = await snapshotOrder("items", categoryId);
    const known = new Set(before.rows.map((r) => r.id));
    if (parsed.data.length !== known.size || !parsed.data.every((id) => known.has(id))) return { ok: false, error: "The category changed. Reload and try again." };
    for (const [index, id] of parsed.data.entries()) await db.update(items).set({ sortOrder: index }).where(eq(items.id, id));
    await log(actor, "move", `Reordered items in ${category.name}`, category.listSlug, {
      entityType: "order",
      entityId: categoryId,
      before,
      after: await snapshotOrder("items", categoryId),
    });
  });
}

/* --------------------------- Translations -------------------------- */

async function entityBelongsToList(entityKey: string, listSlug: string) {
  const [type, rawId] = entityKey.split(":");
  if (type === "l") return rawId === listSlug;
  const id = Number(rawId);
  const query =
    type === "c"
      ? sql`select 1 from categories c where c.id = ${id} and c.list_slug = ${listSlug}`
      : type === "i"
        ? sql`select 1 from items i join categories c on c.id = i.category_id where i.id = ${id} and c.list_slug = ${listSlug}`
        : sql`select 1 from options o join items i on i.id = o.item_id join categories c on c.id = i.category_id where o.id = ${id} and c.list_slug = ${listSlug}`;
  const rows = await db.execute(query);
  return rows.length > 0;
}

export async function saveTranslation(input: TranslationInput) {
  return run("trusted", async (actor) => {
    const parsed = translationInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { listSlug, locale, entityKey, field, value } = parsed.data;
    if (!(await entityBelongsToList(entityKey, listSlug))) return { ok: false, error: "That text no longer exists." };
    const before = await snapshotTranslation(locale, entityKey, field);
    if ((before.value ?? "") === value) return;
    await restoreTranslation({ locale, entityKey, field, value: value || null });
    await log(actor, "translate", `Translated ${entityKey} ${field} (${locale.toUpperCase()})`, listSlug, {
      entityType: "translation",
      entityId: `${locale}|${entityKey}|${field}`,
      before,
      after: { locale, entityKey, field, value: value || null },
    });
  });
}

/* ------------------------------ Undo ------------------------------- */

export async function revertEntry(entryId: number) {
  return run("trusted", async (actor) => {
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.id, entryId));
    if (!entry || !entry.entityType || entry.before === null) return { ok: false, error: "This change cannot be undone." };
    if (entry.revertedAt) return { ok: false, error: "This change was already undone." };
    if (entry.entityType === "role" && actor.role !== "admin") return { ok: false, error: "Only admins can undo role changes." };

    const before = JSON.parse(entry.before);
    const id = entry.entityId ?? "";
    let current: unknown = null;
    switch (entry.entityType as EntityType) {
      case "item":
        current = await snapshotItem(Number(id));
        await restoreItem(Number(id), before);
        break;
      case "category":
        current = await snapshotCategoryTree(Number(id));
        await (before ? restoreCategory(Number(id), before) : restoreCategoryTree(Number(id), null));
        break;
      case "categoryTree":
        current = await snapshotCategoryTree(Number(id));
        await restoreCategoryTree(Number(id), before);
        break;
      case "list":
        current = await snapshotList(id);
        await restoreList(id, before);
        break;
      case "order":
        current = before.table === "items" ? await snapshotOrder("items", Number(id)) : await snapshotOrder("categories", id);
        await restoreOrder(before);
        break;
      case "translation":
        current = await snapshotTranslation(before.locale, before.entityKey, before.field);
        await restoreTranslation(before);
        break;
      case "role": {
        const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, before.userId));
        current = row ? { userId: before.userId, role: row.role } : null;
        await restoreRole(before);
        break;
      }
      default:
        return { ok: false, error: "This change cannot be undone." };
    }

    await db.update(auditLog).set({ revertedAt: new Date(), revertedByName: actor.name }).where(eq(auditLog.id, entryId));
    const entityType = (entry.entityType === "category" && !before ? "categoryTree" : entry.entityType) as EntityType;
    await log(actor, "revert", `Undid: ${entry.summary}`, entry.listSlug, { entityType, entityId: id, before: current, after: before });
  });
}

/* --------------------------- Suggestions --------------------------- */

export async function reviewSuggestion(id: number, accept: boolean, item?: ItemInput) {
  return run("trusted", async (actor) => {
    const [suggestion] = await db.select().from(suggestions).where(eq(suggestions.id, id));
    if (!suggestion || suggestion.status !== "pending") return { ok: false, error: "That suggestion was already handled." };
    if (accept) {
      const parsed = itemInput.safeParse(item);
      if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
      const category = await categoryContext(parsed.data.categoryId);
      if (!category) return { ok: false, error: "Pick a category for the new item." };
      const itemId = await writeItem({ ...parsed.data, id: undefined });
      await log(actor, "create", `Added suggested item "${parsed.data.name}" in ${category.name}`, category.listSlug, {
        entityType: "item",
        entityId: itemId,
        before: null,
        after: await snapshotItem(itemId),
      });
    }
    await db.update(suggestions).set({ status: accept ? "accepted" : "rejected", reviewedByName: actor.name, reviewedAt: new Date() }).where(eq(suggestions.id, id));
  });
}

/* ------------------------------ Users ------------------------------ */

export async function setUserRole(userId: string, role: Role) {
  return run("admin", async (actor) => {
    const parsed = roleInput.safeParse({ userId, role });
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    if (parsed.data.userId === actor.id) return { ok: false, error: "You cannot change your own role." };
    const [target] = await db.select({ name: user.name, role: user.role }).from(user).where(eq(user.id, parsed.data.userId));
    if (!target) return { ok: false, error: "That user no longer exists." };
    await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, parsed.data.userId));
    await log(actor, "role", `Changed role of ${target.name} to ${parsed.data.role}`, null, {
      entityType: "role",
      entityId: parsed.data.userId,
      before: { userId: parsed.data.userId, role: target.role },
      after: parsed.data,
    });
  });
}

/* ---------------------------- Moderation --------------------------- */

/** Moderation entries point at the user they concern. They have no `before`, so they cannot be undone from the activity log. */
async function logModeration(actor: CurrentUser, action: string, summary: string, userId: string, details?: unknown) {
  await db.insert(auditLog).values({
    userId: actor.id,
    userName: actor.name,
    action,
    summary,
    listSlug: null,
    entityType: "user",
    entityId: userId,
    after: details === undefined ? null : JSON.stringify(details),
  });
}

/** Loads the user a moderation action targets. Your own account is managed from the account page, and admins must be demoted first. */
async function moderationTarget(actor: CurrentUser, userId: unknown, { allowAdmins = false } = {}) {
  if (typeof userId !== "string" || !userId) throw new ModerationError("Unknown user.");
  if (userId === actor.id) throw new ModerationError("You cannot do that to your own account.");
  const [target] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, userId));
  if (!target) throw new ModerationError("That user no longer exists.");
  if (!allowAdmins && target.role === "admin") throw new ModerationError(`${target.name} is an admin. Remove their admin role first.`);
  return target;
}

async function rejectPendingSuggestions(actor: CurrentUser, userId: string) {
  const rejected = await db
    .update(suggestions)
    .set({ status: "rejected", reviewedByName: actor.name, reviewedAt: new Date() })
    .where(and(eq(suggestions.submitterId, userId), eq(suggestions.status, "pending")))
    .returning({ id: suggestions.id });
  return rejected.length;
}

/** Bans (or changes the ban of) an account and signs it out everywhere. Signing in is blocked in `auth.ts`. */
export async function banUser(input: BanInput) {
  return run("admin", async (actor) => {
    const parsed = banInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { userId, reason, duration, rejectSuggestions } = parsed.data;
    const target = await moderationTarget(actor, userId);
    const banExpires = banExpiry(duration);
    // Ban first: a sign-in racing with this is refused by `getCurrentUser` even if its session survives the delete.
    await db.update(user).set({ banned: true, banReason: reason, banExpires }).where(eq(user.id, userId));
    await db.delete(session).where(eq(session.userId, userId));
    const rejected = rejectSuggestions ? await rejectPendingSuggestions(actor, userId) : 0;
    const length = duration === "permanent" ? "until unbanned" : `for ${BAN_DURATION_LABELS[duration]}`;
    const extra = rejected ? ` and rejected ${rejected} pending suggestion${rejected === 1 ? "" : "s"}` : "";
    await logModeration(actor, "ban", `Banned ${target.name} ${length}${extra}`, userId, { reason, expires: banExpires?.toISOString() ?? null });
  });
}

export async function unbanUser(userId: string) {
  return run("admin", async (actor) => {
    const target = await moderationTarget(actor, userId, { allowAdmins: true });
    if (!isBanActive(target)) return { ok: false, error: `${target.name} is not banned.` };
    await db.update(user).set({ banned: false, banReason: null, banExpires: null }).where(eq(user.id, target.id));
    await logModeration(actor, "unban", `Lifted the ban on ${target.name}`, target.id);
  });
}

/** Ends one session of a user, or all of them when `sessionId` is left out. */
export async function revokeUserSessions(userId: string, sessionId?: string) {
  return run("admin", async (actor) => {
    const target = await moderationTarget(actor, userId, { allowAdmins: true });
    if (sessionId !== undefined && typeof sessionId !== "string") return { ok: false, error: "Unknown session." };
    const ended = await db
      .delete(session)
      .where(sessionId ? and(eq(session.userId, target.id), eq(session.id, sessionId)) : eq(session.userId, target.id))
      .returning({ id: session.id });
    if (ended.length === 0) return { ok: false, error: "That session already ended." };
    await logModeration(actor, "sign-out", sessionId ? `Ended a session of ${target.name}` : `Signed ${target.name} out on all devices`, target.id);
  });
}

export async function rejectSuggestionsFrom(userId: string) {
  return run("admin", async (actor) => {
    const target = await moderationTarget(actor, userId, { allowAdmins: true });
    const rejected = await rejectPendingSuggestions(actor, target.id);
    if (rejected === 0) return { ok: false, error: `${target.name} has no pending suggestions.` };
    await logModeration(actor, "reject", `Rejected ${rejected} pending suggestion${rejected === 1 ? "" : "s"} from ${target.name}`, target.id);
  });
}

/** Permanently deletes an account with its sessions, sign-in methods, and synced answers. Their suggestions and editing history stay. */
export async function deleteUserAccount(userId: string, confirmEmail: string) {
  return run("admin", async (actor) => {
    const target = await moderationTarget(actor, userId);
    if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
      return { ok: false, error: "Type the account's email address to confirm." };
    }
    await db.delete(user).where(eq(user.id, target.id));
    await logModeration(actor, "delete-user", `Deleted the account of ${target.name}`, target.id);
  });
}
