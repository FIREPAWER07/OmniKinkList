"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userVaults } from "@/db/schema";
import { consumeRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

export interface VaultRecord {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
  version: number;
  updatedAt: string;
}

export type PutVaultResult =
  | { ok: true; version: number; updatedAt: string }
  | { ok: false; reason: "conflict"; current: VaultRecord }
  | { ok: false; reason: "unauthorized" | "rate-limited" | "invalid" };

const MAX_CIPHERTEXT = 4_000_000;

const putInput = z.object({
  ciphertext: z.string().min(1).max(MAX_CIPHERTEXT),
  iv: z.string().min(8).max(64),
  salt: z.string().min(8).max(64),
  iterations: z.number().int().min(100_000).max(10_000_000),
  /** Version the client last saw; 0 when creating the vault. */
  baseVersion: z.number().int().min(0),
  /** Allows replacing the vault regardless of version (changing passphrase). */
  force: z.boolean().optional(),
});

function toRecord(row: typeof userVaults.$inferSelect): VaultRecord {
  return {
    ciphertext: row.ciphertext,
    iv: row.iv,
    salt: row.salt,
    iterations: row.iterations,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
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
  try {
    await consumeRateLimit(`vault:${user.id}`, 120, 600);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, reason: "rate-limited" };
    throw error;
  }

  const { baseVersion, force, ...fields } = parsed.data;
  const [current] = await db.select().from(userVaults).where(eq(userVaults.userId, user.id));
  if (current && !force && current.version !== baseVersion) return { ok: false, reason: "conflict", current: toRecord(current) };

  const version = (current?.version ?? 0) + 1;
  const updatedAt = new Date();
  if (current) {
    await db.update(userVaults).set({ ...fields, version, updatedAt }).where(eq(userVaults.userId, user.id));
  } else {
    await db.insert(userVaults).values({ userId: user.id, ...fields, version, updatedAt });
  }
  return { ok: true, version, updatedAt: updatedAt.toISOString() };
}

export async function deleteVault(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.delete(userVaults).where(eq(userVaults.userId, user.id));
  return { ok: true };
}
