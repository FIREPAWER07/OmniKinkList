"use server";

import { z } from "zod";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { verifyCaptcha } from "@/lib/captcha";
import { clientIp, consumeRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

const labels = z
  .array(z.string().trim().min(1).max(50))
  .max(12)
  .transform((values) => [...new Set(values)]);

const suggestionInput = z.object({
  listSlug: z.string().trim().min(1).max(32),
  categoryId: z.number().int().positive().nullable(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  roles: labels,
  variants: labels,
  comment: z.string().trim().max(500),
  locale: z.string(),
  captchaToken: z.string().optional(),
  /** Hidden field real people leave empty. */
  website: z.string().max(0).optional(),
});

export type SuggestionResult = { ok: true } | { ok: false; error: "invalid" | "captcha" | "rate-limited" };

export async function submitSuggestion(input: z.input<typeof suggestionInput>): Promise<SuggestionResult> {
  const parsed = suggestionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const ip = await clientIp();
  if (!(await verifyCaptcha(parsed.data.captchaToken, ip))) return { ok: false, error: "captcha" };
  try {
    await consumeRateLimit(`suggest:${ip}`, 5, 3600);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: "rate-limited" };
    throw error;
  }
  const user = await getCurrentUser();
  const { listSlug, categoryId, name, description, comment, roles, variants, locale } = parsed.data;
  await db.insert(suggestions).values({
    listSlug,
    categoryId,
    name,
    description,
    comment,
    roles: JSON.stringify(roles),
    variants: JSON.stringify(variants),
    locale: isLocale(locale) ? locale : "en",
    submitterId: user?.id ?? null,
  });
  return { ok: true };
}
