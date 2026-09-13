import "server-only";
import type { Role } from "@/db/schema";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "./auth";
import { asRole, hasRole } from "./roles";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: asRole(role) };
}

/** For pages: redirects to login when signed out, 403 when the role is too low. */
export async function requirePageRole(minimum: Role, returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!hasRole(user.role, minimum)) forbidden();
  return user;
}

export class AuthorizationError extends Error {}

/** For server actions: throws when the caller lacks the role. */
export async function requireActionRole(minimum: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, minimum)) {
    throw new AuthorizationError("You don't have permission to do that.");
  }
  return user;
}
