import { relations, sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { OPTION_KINDS } from "../lib/kinks/types";
import { ROLES } from "../lib/roles";

/*
 * Every table enables row level security without adding policies. The app connects as the table
 * owner, which is not affected, while Supabase's public Data API (anon and authenticated roles)
 * cannot read or write anything.
 */

/* ------------------------------------------------------------------ */
/* Auth (Better Auth core tables + `role`)                             */
/* ------------------------------------------------------------------ */

export { ROLES, type Role } from "../lib/roles";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role", { enum: ROLES }).default("user").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  locale: text("locale").default("en").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}).enableRLS();

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
).enableRLS();

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
).enableRLS();

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
).enableRLS();

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [index("two_factor_secret_idx").on(table.secret), index("two_factor_user_id_idx").on(table.userId)],
).enableRLS();

/** Better Auth rate limit counters (auth endpoints). */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
}).enableRLS();

/* ------------------------------------------------------------------ */
/* Kink list content                                                   */
/* ------------------------------------------------------------------ */

export const lists = pgTable("lists", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    listSlug: text("list_slug")
      .notNull()
      .references(() => lists.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("sparkle"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("categories_list_idx").on(table.listSlug, table.sortOrder)],
).enableRLS();

export const items = pgTable(
  "items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("items_category_idx").on(table.categoryId, table.sortOrder)],
).enableRLS();

export const options = pgTable(
  "options",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: text("kind", { enum: OPTION_KINDS }).notNull().default("variant"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("options_item_idx").on(table.itemId, table.sortOrder)],
).enableRLS();

/** Who changed what. Kept even if the user is deleted. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    listSlug: text("list_slug"),
    /** What the change touched and JSON snapshots before and after, used to undo it. */
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    before: text("before"),
    after: text("after"),
    revertedAt: timestamp("reverted_at", { withTimezone: true }),
    revertedByName: text("reverted_by_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt)],
).enableRLS();

/** Translations of list content. `entityKey` is `l:slug`, `c:id`, `i:id`, or `o:id`. */
export const contentTranslations = pgTable(
  "content_translations",
  {
    locale: text("locale").notNull(),
    entityKey: text("entity_key").notNull(),
    field: text("field").notNull(),
    value: text("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.locale, table.entityKey, table.field] }), index("content_translations_entity_idx").on(table.entityKey)],
).enableRLS();

/**
 * Published snapshots. The public site only reads these; editors work on the tables above
 * (the draft) and publish a new version when ready.
 */
export const listVersions = pgTable(
  "list_versions",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    listSlug: text("list_slug")
      .notNull()
      .references(() => lists.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    version: integer("version").notNull(),
    data: text("data").notNull(),
    changes: text("changes").notNull(),
    note: text("note").notNull().default(""),
    publishedById: text("published_by_id").references(() => user.id, { onDelete: "set null" }),
    publishedByName: text("published_by_name").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("list_versions_slug_version_idx").on(table.listSlug, table.version)],
).enableRLS();

export const SUGGESTION_STATUSES = ["pending", "accepted", "rejected"] as const;

/** Items suggested by visitors, waiting for an editor. */
export const suggestions = pgTable(
  "suggestions",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    listSlug: text("list_slug").notNull(),
    categoryId: integer("category_id"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    roles: text("roles").notNull().default("[]"),
    variants: text("variants").notNull().default("[]"),
    comment: text("comment").notNull().default(""),
    locale: text("locale").notNull().default("en"),
    status: text("status", { enum: SUGGESTION_STATUSES }).notNull().default("pending"),
    submitterId: text("submitter_id").references(() => user.id, { onDelete: "set null" }),
    reviewedByName: text("reviewed_by_name"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("suggestions_status_idx").on(table.status, table.createdAt)],
).enableRLS();

/** Fixed-window counters for app-level rate limits (editor actions, suggestions, sync). */
export const appRateLimits = pgTable("app_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: bigint("reset_at", { mode: "number" }).notNull(),
}).enableRLS();

/**
 * Synced answers backup, one per account, stored in one of two ways:
 * - readable: `data` holds the answers as JSON
 * - end-to-end encrypted: `ciphertext`, `iv`, `salt`, and `iterations`, with the key derived in the
 *   browser from a passphrase the server never receives
 */
export const userVaults = pgTable(
  "user_vaults",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    data: text("data"),
    ciphertext: text("ciphertext"),
    iv: text("iv"),
    salt: text("salt"),
    iterations: integer("iterations"),
    version: integer("version").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    check(
      "user_vaults_one_payload",
      sql`(${table.data} is not null and ${table.ciphertext} is null) or (${table.data} is null and ${table.ciphertext} is not null and ${table.iv} is not null and ${table.salt} is not null and ${table.iterations} is not null)`,
    ),
  ],
).enableRLS();

export const listsRelations = relations(lists, ({ many }) => ({ categories: many(categories) }));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  list: one(lists, { fields: [categories.listSlug], references: [lists.slug] }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  options: many(options),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  item: one(items, { fields: [options.itemId], references: [items.id] }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
