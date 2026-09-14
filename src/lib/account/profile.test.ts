import { describe, expect, test } from "bun:test";
import { generateUsername, isValidUsername, normalizeUsername, profileInput } from "./profile";

describe("usernames", () => {
  test("are normalized to lowercase without a leading @", () => {
    expect(normalizeUsername("  @Kitty_Cat ")).toBe("kitty_cat");
  });

  test("allow 3 to 24 lowercase letters, numbers, and underscores", () => {
    expect(isValidUsername("abc")).toBe(true);
    expect(isValidUsername("a_1")).toBe(true);
    expect(isValidUsername("x".repeat(24))).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("x".repeat(25))).toBe(false);
    expect(isValidUsername("has space")).toBe(false);
    expect(isValidUsername("dash-name")).toBe(false);
    expect(isValidUsername("Upper")).toBe(false);
    expect(isValidUsername("___")).toBe(false);
  });

  test("cannot impersonate the site or its staff", () => {
    expect(isValidUsername("admin")).toBe(false);
    expect(isValidUsername("omnikinklist")).toBe(false);
  });

  test("generated usernames are valid and don't repeat", () => {
    const names = Array.from({ length: 50 }, generateUsername);
    expect(names.every(isValidUsername)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("profile input", () => {
  const base = { name: "Alex", username: "Alex_1", bio: "", profilePublic: true };

  test("normalizes the username and tidies the bio", () => {
    const result = profileInput.parse({ ...base, bio: "  Hi\n\n\n\nthere  " });
    expect(result.username).toBe("alex_1");
    expect(result.bio).toBe("Hi\n\nthere");
  });

  test("rejects an empty name, a bad username, and a long bio", () => {
    expect(profileInput.safeParse({ ...base, name: "   " }).success).toBe(false);
    expect(profileInput.safeParse({ ...base, username: "admin" }).success).toBe(false);
    expect(profileInput.safeParse({ ...base, bio: "x".repeat(301) }).success).toBe(false);
  });
});
