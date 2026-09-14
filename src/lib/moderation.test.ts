import { describe, expect, test } from "bun:test";
import { banExpiry, isBanActive } from "./moderation";

const now = Date.UTC(2026, 0, 1);

describe("bans", () => {
  test("timed bans end after their duration, permanent ones never do", () => {
    expect(banExpiry("1d", now)?.getTime()).toBe(now + 86_400_000);
    expect(banExpiry("30d", now)?.getTime()).toBe(now + 30 * 86_400_000);
    expect(banExpiry("permanent", now)).toBeNull();
  });

  test("a ban only counts while it has not expired", () => {
    expect(isBanActive({ banned: false }, now)).toBe(false);
    expect(isBanActive({ banned: true, banExpires: null }, now)).toBe(true);
    expect(isBanActive({ banned: true, banExpires: new Date(now + 1000) }, now)).toBe(true);
    expect(isBanActive({ banned: true, banExpires: new Date(now - 1000).toISOString() }, now)).toBe(false);
  });
});
