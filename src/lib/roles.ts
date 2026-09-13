export const ROLES = ["user", "trusted", "admin"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { user: 0, trusted: 1, admin: 2 };

export const ROLE_LABELS: Record<Role, string> = {
  user: "User",
  trusted: "Trusted editor",
  admin: "Admin",
};

export function asRole(value: unknown): Role {
  return value === "admin" || value === "trusted" ? value : "user";
}

export function hasRole(role: unknown, minimum: Role) {
  return RANK[asRole(role)] >= RANK[minimum];
}
