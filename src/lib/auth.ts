import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

/** Emails in `ADMIN_EMAILS` (comma separated) become admins when they sign up. */
function isBootstrapAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

const socialProviders: BetterAuthOptions["socialProviders"] = {};
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  socialProviders.discord = {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const enabledSocialProviders = Object.keys(socialProviders) as ("discord" | "github")[];

export const auth = betterAuth({
  appName: "OmniKinkList",
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  trustedOrigins: process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    disableSignUp: process.env.DISABLE_SIGNUP === "true",
  },
  socialProviders,
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => ({
          data: { ...newUser, role: isBootstrapAdmin(newUser.email) ? "admin" : "user" },
        }),
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
