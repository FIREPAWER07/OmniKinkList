"use server";

import { and, asc, eq, max, notInArray } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { auditLog, categories, items, lists, options, user, type Role } from "@/db/schema";
import {
  categoryInput,
  firstIssue,
  itemInput,
  listInput,
  roleInput,
  type CategoryInput,
  type ItemInput,
  type ListInput,
} from "@/lib/admin/validation";
import { LISTS_TAG } from "@/lib/kinks/data";
import { AuthorizationError, requireActionRole, type CurrentUser } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };
type Direction = "up" | "down";

/** Runs a mutation with a role check and turns known failures into a result instead of a thrown error. */
async function run(minimum: Role, mutate: (actor: CurrentUser) => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const actor = await requireActionRole(minimum);
    return (await mutate(actor)) ?? { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong while saving. Try again." };
  }
}

async function log(actor: CurrentUser, action: string, summary: string, listSlug: string | null) {
  await db.insert(auditLog).values({ userId: actor.id, userName: actor.name, action, summary, listSlug });
}

function contentChanged() {
  updateTag(LISTS_TAG);
}

async function categoryContext(categoryId: number) {
  const [row] = await db
    .select({ id: categories.id, name: categories.name, listSlug: categories.listSlug })
    .from(categories)
    .where(eq(categories.id, categoryId));
  return row ?? null;
}

/** Moves one row up or down among its siblings by rewriting their sort order. */
async function reorder<T extends { id: number | string }>(siblings: T[], id: T["id"], direction: Direction, write: (id: T["id"], order: number) => Promise<unknown>) {
  const index = siblings.findIndex((s) => s.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return false;
  const next = [...siblings];
  [next[index], next[target]] = [next[target], next[index]];
  await Promise.all(next.map((s, order) => write(s.id, order)));
  return true;
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
    await log(actor, "create", `Created list "${parsed.data.name}"`, parsed.data.slug);
    contentChanged();
  });
}

export async function updateList(input: ListInput) {
  return run("trusted", async (actor) => {
    const parsed = listInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { slug, ...fields } = parsed.data;
    const updated = await db.update(lists).set(fields).where(eq(lists.slug, slug)).returning({ slug: lists.slug });
    if (updated.length === 0) return { ok: false, error: "That list no longer exists." };
    await log(actor, "update", `Updated details of list "${fields.name}"`, slug);
    contentChanged();
  });
}

export async function deleteList(slug: string) {
  return run("admin", async (actor) => {
    const [row] = await db.select({ name: lists.name }).from(lists).where(eq(lists.slug, slug));
    if (!row) return { ok: false, error: "That list no longer exists." };
    await db.delete(lists).where(eq(lists.slug, slug));
    await log(actor, "delete", `Deleted list "${row.name}"`, slug);
    contentChanged();
  });
}

/* ---------------------------- Categories --------------------------- */

export async function saveCategory(input: CategoryInput) {
  return run("trusted", async (actor) => {
    const parsed = categoryInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { id, listSlug, name, description } = parsed.data;

    if (id) {
      const updated = await db
        .update(categories)
        .set({ name, description })
        .where(and(eq(categories.id, id), eq(categories.listSlug, listSlug)))
        .returning({ id: categories.id });
      if (updated.length === 0) return { ok: false, error: "That category no longer exists." };
      await log(actor, "update", `Updated category "${name}"`, listSlug);
    } else {
      const [list] = await db.select({ slug: lists.slug }).from(lists).where(eq(lists.slug, listSlug));
      if (!list) return { ok: false, error: "That list no longer exists." };
      const [{ value: last }] = await db
        .select({ value: max(categories.sortOrder) })
        .from(categories)
        .where(eq(categories.listSlug, listSlug));
      await db.insert(categories).values({ listSlug, name, description, sortOrder: (last ?? -1) + 1 });
      await log(actor, "create", `Added category "${name}"`, listSlug);
    }
    contentChanged();
  });
}

export async function moveCategory(id: number, direction: Direction) {
  return run("trusted", async (actor) => {
    const category = await categoryContext(id);
    if (!category) return { ok: false, error: "That category no longer exists." };
    const siblings = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.listSlug, category.listSlug))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    const moved = await reorder(siblings, id, direction, (rowId, order) =>
      db.update(categories).set({ sortOrder: order }).where(eq(categories.id, rowId)),
    );
    if (moved) {
      await log(actor, "move", `Moved category "${category.name}" ${direction}`, category.listSlug);
      contentChanged();
    }
  });
}

export async function deleteCategory(id: number) {
  return run("trusted", async (actor) => {
    const category = await categoryContext(id);
    if (!category) return { ok: false, error: "That category no longer exists." };
    await db.delete(categories).where(eq(categories.id, id));
    await log(actor, "delete", `Deleted category "${category.name}" and its items`, category.listSlug);
    contentChanged();
  });
}

/* ------------------------------ Items ------------------------------ */

export async function saveItem(input: ItemInput) {
  return run("trusted", async (actor) => {
    const parsed = itemInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { id, categoryId, name, description, options: optionInputs } = parsed.data;
    const category = await categoryContext(categoryId);
    if (!category) return { ok: false, error: "That category no longer exists." };

    let itemId = id;
    if (itemId) {
      const updated = await db
        .update(items)
        .set({ name, description, categoryId })
        .where(eq(items.id, itemId))
        .returning({ id: items.id });
      if (updated.length === 0) return { ok: false, error: "That item no longer exists." };
    } else {
      const [{ value: last }] = await db
        .select({ value: max(items.sortOrder) })
        .from(items)
        .where(eq(items.categoryId, categoryId));
      const [created] = await db
        .insert(items)
        .values({ categoryId, name, description, sortOrder: (last ?? -1) + 1 })
        .returning({ id: items.id });
      itemId = created.id;
    }

    // Keep ids of options that still exist so saved answers stay attached to them.
    const keptIds = optionInputs.map((o) => o.id).filter((v): v is number => typeof v === "number");
    await db
      .delete(options)
      .where(keptIds.length ? and(eq(options.itemId, itemId), notInArray(options.id, keptIds)) : eq(options.itemId, itemId));
    for (const [order, option] of optionInputs.entries()) {
      if (option.id) {
        await db
          .update(options)
          .set({ label: option.label, sortOrder: order })
          .where(and(eq(options.id, option.id), eq(options.itemId, itemId)));
      } else {
        await db.insert(options).values({ itemId, label: option.label, sortOrder: order });
      }
    }

    await log(actor, id ? "update" : "create", `${id ? "Updated" : "Added"} item "${name}" in ${category.name}`, category.listSlug);
    contentChanged();
  });
}

export async function moveItem(id: number, direction: Direction) {
  return run("trusted", async (actor) => {
    const [item] = await db.select({ name: items.name, categoryId: items.categoryId }).from(items).where(eq(items.id, id));
    if (!item) return { ok: false, error: "That item no longer exists." };
    const category = await categoryContext(item.categoryId);
    const siblings = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.categoryId, item.categoryId))
      .orderBy(asc(items.sortOrder), asc(items.id));
    const moved = await reorder(siblings, id, direction, (rowId, order) =>
      db.update(items).set({ sortOrder: order }).where(eq(items.id, rowId)),
    );
    if (moved) {
      await log(actor, "move", `Moved item "${item.name}" ${direction}`, category?.listSlug ?? null);
      contentChanged();
    }
  });
}

export async function deleteItem(id: number) {
  return run("trusted", async (actor) => {
    const [item] = await db.select({ name: items.name, categoryId: items.categoryId }).from(items).where(eq(items.id, id));
    if (!item) return { ok: false, error: "That item no longer exists." };
    const category = await categoryContext(item.categoryId);
    await db.delete(items).where(eq(items.id, id));
    await log(actor, "delete", `Deleted item "${item.name}"${category ? ` from ${category.name}` : ""}`, category?.listSlug ?? null);
    contentChanged();
  });
}

/* ------------------------------ Users ------------------------------ */

export async function setUserRole(userId: string, role: Role) {
  return run("admin", async (actor) => {
    const parsed = roleInput.safeParse({ userId, role });
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    if (parsed.data.userId === actor.id) return { ok: false, error: "You cannot change your own role." };
    const [target] = await db
      .update(user)
      .set({ role: parsed.data.role })
      .where(eq(user.id, parsed.data.userId))
      .returning({ name: user.name, email: user.email });
    if (!target) return { ok: false, error: "That user no longer exists." };
    await log(actor, "role", `Changed role of ${target.name} to ${parsed.data.role}`, null);
    revalidatePath("/admin/users");
  });
}

