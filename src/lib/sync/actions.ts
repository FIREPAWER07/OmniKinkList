"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userVaults } from "@/db/schema";
import type { StoreSnapshot } from "@/lib/kinks/store";
import { isRateLimited } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

/** A synced vault: either readable answers, or answers encrypted in the browser. */
export type VaultRecord = { version: number; updatedAt: string } & (
  | { encrypted: false; snapshot: StoreSnapshot }
  | { encrypted: true; ciphertext: string; iv: string; salt: string; iterations: number }
);

export type PutVaultResult =
  | { ok: true; version: number; updatedAt: string }
  | { ok: false; reason: "conflict"; current: VaultRecord }
  | { ok: false; reason: "unauthorized" | "rate-limited" | "invalid" };

const MAX_PAYLOAD = 4_000_000;

const versioning = {
  /** Version the client last saw; 0 when creating the vault. */
  baseVersion: z.number().int().min(0),
  /** Allows replacing the vault regardless of version (turning sync on, changing encryption). */
  force: z.boolean().optional(),
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const putInput = z.discriminatedUnion("encrypted", [
  z.object({
    encrypted: z.literal(false),
    // Kept as sent: clients sanitize every snapshot they pull.
    snapshot: z.custom<StoreSnapshot>((value) => isObject(value) && isObject(value.profiles) && isObject(value.data)),
    ...versioning,
  }),
  z.object({
    encrypted: z.literal(true),
    ciphertext: z.string().min(1).max(MAX_PAYLOAD),
    iv: z.string().min(8).max(64),
    salt: z.string().min(8).max(64),
    iterations: z.number().int().min(100_000).max(10_000_000),
    ...versioning,
  }),
]);

function toRecord(row: typeof userVaults.$inferSelect): VaultRecord {
  const meta = { version: row.version, updatedAt: row.updatedAt.toISOString() };
  if (row.ciphertext !== null && row.iv !== null && row.salt !== null && row.iterations !== null) {
    return { ...meta, encrypted: true, ciphertext: row.ciphertext, iv: row.iv, salt: row.salt, iterations: row.iterations };
  }
  return { ...meta, encrypted: false, snapshot: JSON.parse(row.data ?? "{}") as StoreSnapshot };
}

export async function getVault(): Promise<VaultRecord | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [row] = await db.select().from(userVaults).where(eq(userVaults.userId, user.id));
  return row ? toRecord(row) : null;
}

export async function putVault(input: z.input<typeof putInput>): Promise<PutVaultResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  const parsed = putInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const payload = parsed.data.encrypted
    ? { data: null, ciphertext: parsed.data.ciphertext, iv: parsed.data.iv, salt: parsed.data.salt, iterations: parsed.data.iterations }
    : { data: JSON.stringify(parsed.data.snapshot), ciphertext: null, iv: null, salt: null, iterations: null };
  if (payload.data && payload.data.length > MAX_PAYLOAD) return { ok: false, reason: "invalid" };
  if (await isRateLimited(`vault:${user.id}`, 120, 600)) return { ok: false, reason: "rate-limited" };

  const { baseVersion, force } = parsed.data;
  const [current] = await db.select().from(userVaults).where(eq(userVaults.userId, user.id));
  if (current && !force && current.version !== baseVersion) return { ok: false, reason: "conflict", current: toRecord(current) };

  const version = (current?.version ?? 0) + 1;
  const updatedAt = new Date();
  const values = { ...payload, version, updatedAt };
  // Unless forced, only the version read above is replaced, so a device syncing at the same moment gets a conflict
  // (and merges) instead of silently overwriting the other one.
  const written = current
    ? await db
        .update(userVaults)
        .set(values)
        .where(force ? eq(userVaults.userId, user.id) : and(eq(userVaults.userId, user.id), eq(userVaults.version, current.version)))
        .returning({ version: userVaults.version })
    : await db
        .insert(userVaults)
        .values({ userId: user.id, ...values })
        .onConflictDoNothing()
        .returning({ version: userVaults.version });
  if (written.length === 0) {
    const [latest] = await db.select().from(userVaults).where(eq(userVaults.userId, user.id));
    if (latest) return { ok: false, reason: "conflict", current: toRecord(latest) };
  }
  return { ok: true, version, updatedAt: updatedAt.toISOString() };
}

export async function deleteVault(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.delete(userVaults).where(eq(userVaults.userId, user.id));
  return { ok: true };
}
