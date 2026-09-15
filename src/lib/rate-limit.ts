import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many requests. Try again in a moment.");
  }
}

/**
 * Fixed-window counter stored in the database, so it works across serverless instances.
 * Throws `RateLimitError` once `limit` requests happened within `windowSeconds`.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  const [row] = await db.execute<{ count: number; reset_at: string }>(sql`
    insert into app_rate_limits (key, count, reset_at) values (${key}, 1, ${resetAt})
    on conflict(key) do update set
      count = case when app_rate_limits.reset_at <= ${now} then 1 else app_rate_limits.count + 1 end,
      reset_at = case when app_rate_limits.reset_at <= ${now} then ${resetAt} else app_rate_limits.reset_at end
    returning count, reset_at
  `);
  if (row && Number(row.count) > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((Number(row.reset_at) - now) / 1000)));
  }
}

/** Like `consumeRateLimit`, but returns whether the limit was hit instead of throwing. */
export async function isRateLimited(key: string, limit: number, windowSeconds: number) {
  try {
    await consumeRateLimit(key, limit, windowSeconds);
    return false;
  } catch (error) {
    if (error instanceof RateLimitError) return true;
    throw error;
  }
}

/** Best-effort client IP (Netlify sets `x-nf-client-connection-ip`). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}
