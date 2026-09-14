export const BAN_DURATIONS = ["1d", "7d", "30d", "permanent"] as const;
export type BanDuration = (typeof BAN_DURATIONS)[number];

export const BAN_DURATION_LABELS: Record<BanDuration, string> = {
  "1d": "1 day",
  "7d": "7 days",
  "30d": "30 days",
  permanent: "Until unbanned",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DURATION_DAYS: Record<Exclude<BanDuration, "permanent">, number> = { "1d": 1, "7d": 7, "30d": 30 };

/** When a ban of this length ends, or null when it lasts until an admin lifts it. */
export function banExpiry(duration: BanDuration, now = Date.now()): Date | null {
  return duration === "permanent" ? null : new Date(now + DURATION_DAYS[duration] * DAY_MS);
}

/** A ban stops counting once it expires, without anyone having to lift it. */
export function isBanActive(state: { banned?: boolean | null; banExpires?: Date | string | null }, now = Date.now()) {
  if (!state.banned) return false;
  return !state.banExpires || new Date(state.banExpires).getTime() > now;
}

/** Error code sent when a banned account tries to sign in (matches Better Auth's admin plugin). */
export const BANNED_ERROR_CODE = "BANNED_USER";
