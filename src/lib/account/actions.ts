"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

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
