import "server-only";
import { and, count, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { suggestions, user } from "@/db/schema";
import { isBanActive } from "@/lib/moderation";
import { asRole } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { isValidUsername, normalizeUsername } from "./profile";

/**
 * The profile page for `/u/<username>`, or null when it doesn't exist, is private and the viewer isn't its owner, or
 * belongs to a banned account. Only fields meant for the page are loaded, never the email.
 * Cached per request so the page and its metadata share one lookup.
 */
export const getProfile = cache(async (rawUsername: string) => {
  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) return null;
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      role: user.role,
      profilePublic: user.profilePublic,
      banned: user.banned,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.username, username));
  if (!row || isBanActive(row)) return null;

  const [viewer, [{ accepted }]] = await Promise.all([
    getCurrentUser(),
    db
      .select({ accepted: count() })
      .from(suggestions)
      .where(and(eq(suggestions.submitterId, row.id), eq(suggestions.status, "accepted"))),
  ]);
  const isOwner = viewer?.id === row.id;
  if (!row.profilePublic && !isOwner) return null;

  return {
    name: row.name,
    username: row.username,
    bio: row.bio,
    role: asRole(row.role),
    profilePublic: row.profilePublic,
    createdAt: row.createdAt,
    acceptedSuggestions: accepted,
    isOwner,
  };
});
