import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { OPTION_KINDS } from "../lib/kinks/types";
import { ROLES } from "../lib/roles";

/* ------------------------------------------------------------------ */
/* Auth (Better Auth core tables + `role`)                             */
/* ------------------------------------------------------------------ */

export { ROLES, type Role } from "../lib/roles";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  role: text("role", { enum: ROLES }).default("user").notNull(),
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(false),
  locale: text("locale").default("en").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
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
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const twoFactor = sqliteTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: integer("verified", { mode: "boolean" }).default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  },
  (table) => [index("two_factor_secret_idx").on(table.secret), index("two_factor_user_id_idx").on(table.userId)],
);

/** Better Auth rate limit counters (auth endpoints). */
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

/* ------------------------------------------------------------------ */
/* Kink list content                                                   */
/* ------------------------------------------------------------------ */

export const lists = sqliteTable("lists", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listSlug: text("list_slug")
      .notNull()
      .references(() => lists.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("sparkle"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("categories_list_idx").on(table.listSlug, table.sortOrder)],
);

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("items_category_idx").on(table.categoryId, table.sortOrder)],
);

export const options = sqliteTable(
  "options",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: text("kind", { enum: OPTION_KINDS }).notNull().default("variant"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("options_item_idx").on(table.itemId, table.sortOrder)],
);

/** Who changed what. Kept even if the user is deleted. */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    revertedAt: integer("reverted_at", { mode: "timestamp_ms" }),
    revertedByName: text("reverted_by_name"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt)],
);

/** Translations of list content. `entityKey` is `l:slug`, `c:id`, `i:id`, or `o:id`. */
export const contentTranslations = sqliteTable(
  "content_translations",
  {
    locale: text("locale").notNull(),
    entityKey: text("entity_key").notNull(),
    field: text("field").notNull(),
    value: text("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.locale, table.entityKey, table.field] }), index("content_translations_entity_idx").on(table.entityKey)],
);

/**
 * Published snapshots. The public site only reads these; editors work on the tables above
 * (the draft) and publish a new version when ready.
 */
export const listVersions = sqliteTable(
  "list_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listSlug: text("list_slug")
      .notNull()
      .references(() => lists.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    version: integer("version").notNull(),
    data: text("data").notNull(),
    changes: text("changes").notNull(),
    note: text("note").notNull().default(""),
    publishedById: text("published_by_id").references(() => user.id, { onDelete: "set null" }),
    publishedByName: text("published_by_name").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("list_versions_slug_version_idx").on(table.listSlug, table.version)],
);

export const SUGGESTION_STATUSES = ["pending", "accepted", "rejected"] as const;

/** Items suggested by visitors, waiting for an editor. */
export const suggestions = sqliteTable(
  "suggestions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("suggestions_status_idx").on(table.status, table.createdAt)],
);

/** Fixed-window counters for app-level rate limits (editor actions, suggestions, sync). */
export const appRateLimits = sqliteTable("app_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

/**
 * End-to-end encrypted answers backup. The server only ever sees ciphertext; the key is
 * derived in the browser from a passphrase the server never receives.
 */
export const userVaults = sqliteTable("user_vaults", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  salt: text("salt").notNull(),
  iterations: integer("iterations").notNull(),
  version: integer("version").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

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
