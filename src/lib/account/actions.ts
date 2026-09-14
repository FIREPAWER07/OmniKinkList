"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { consumeRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { profileInput, type ProfileInput } from "./profile";

export async function getAccountInfo() {
  const current = await getCurrentUser();
  if (!current) return null;
  const accounts = await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, current.id));
  return {
    hasPassword: accounts.some((a) => a.providerId === "credential"),
    providers: accounts.map((a) => a.providerId).filter((p) => p !== "credential"),
  };
}

/** Lets accounts created with Google or Proton add a password (needed to delete the account or for 2FA backup). */
export async function setInitialPassword(newPassword: string) {
  if (newPassword.length < 10 || newPassword.length > 128) return { ok: false as const };
  await auth.api.setPassword({ body: { newPassword }, headers: await headers() });
  return { ok: true as const };
}

export async function updateLocale(locale: string) {
  const current = await getCurrentUser();
  if (!current || !isLocale(locale)) return { ok: false as const };
  await db.update(user).set({ locale }).where(eq(user.id, current.id));
  return { ok: true as const };
}

export type UpdateProfileResult =
  | { ok: true; username: string }
  | { ok: false; error: "invalid"; field: keyof ProfileInput }
  | { ok: false; error: "unauthorized" | "username-taken" | "rate-limited" };

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
}

export async function updateProfile(input: ProfileInput): Promise<UpdateProfileResult> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, error: "unauthorized" };
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", field: parsed.error.issues[0]?.path[0] as keyof ProfileInput };
  try {
    // Also slows down guessing which usernames exist through the "taken" error.
    await consumeRateLimit(`profile:${current.id}`, 30, 3600);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: "rate-limited" };
    throw error;
  }

  const { name, username, bio, profilePublic } = parsed.data;
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.username, username));
  if (owner && owner.id !== current.id) return { ok: false, error: "username-taken" };
  try {
    await db.update(user).set({ name, username, bio, profilePublic }).where(eq(user.id, current.id));
  } catch (error) {
    // Someone claimed the username between the check and the update.
    if (isUniqueViolation(error)) return { ok: false, error: "username-taken" };
    throw error;
  }
  return { ok: true, username };
}
