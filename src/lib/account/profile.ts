import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const NAME_MAX = 40;
export const BIO_MAX = 300;

/** Lowercase letters, numbers, and underscores, with at least one letter or number. */
const USERNAME_PATTERN = new RegExp(`^(?=.*[a-z0-9])[a-z0-9_]{${USERNAME_MIN},${USERNAME_MAX}}$`);

/** Names that could pass for the site or its staff, or clash with app paths. */
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "anonymous",
  "account",
  "api",
  "deleted",
  "editor",
  "help",
  "me",
  "mod",
  "moderator",
  "null",
  "official",
  "okl",
  "omnikinklist",
  "root",
  "settings",
  "staff",
  "support",
  "system",
  "undefined",
]);

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value) && !RESERVED_USERNAMES.has(value);
}

/** Given to every new account so profile links never contain its name or email. It can be changed later. */
export function generateUsername() {
  return `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export const profileInput = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  username: z.string().transform(normalizeUsername).refine(isValidUsername),
  bio: z
    .string()
    .max(BIO_MAX * 2)
    .transform((bio) => bio.trim().replace(/\n{3,}/g, "\n\n"))
    .refine((bio) => bio.length <= BIO_MAX),
  profilePublic: z.boolean(),
});

export type ProfileInput = z.input<typeof profileInput>;
