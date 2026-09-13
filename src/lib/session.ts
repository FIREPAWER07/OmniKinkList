import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "./auth";
import { asRole, hasRole, type Role } from "./roles";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  twoFactorEnabled: boolean;
}

/** Editors and admins must use two-factor authentication unless turned off for local testing. */
export const EDITOR_2FA_REQUIRED = process.env.REQUIRE_EDITOR_2FA !== "false";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role, twoFactorEnabled } = session.user;
  return { id, name, email, role: asRole(role), twoFactorEnabled: !!twoFactorEnabled };
}

/** For editor pages: login when signed out, 403 when the role is too low, 2FA setup when missing. */
export async function requirePageRole(minimum: Role, returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!hasRole(user.role, minimum)) forbidden();
  if (EDITOR_2FA_REQUIRED && !user.twoFactorEnabled) redirect(`/account?require2fa=1&next=${encodeURIComponent(returnTo)}`);
  return user;
}

export class AuthorizationError extends Error {}

/** For server actions: throws when the caller lacks the role or 2FA. */
export async function requireActionRole(minimum: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, minimum)) throw new AuthorizationError("You don't have permission to do that.");
  if (EDITOR_2FA_REQUIRED && !user.twoFactorEnabled) throw new AuthorizationError("Turn on two-factor authentication first.");
  return user;
}
