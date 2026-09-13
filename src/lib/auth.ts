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

/**
 * The production URL comes from BETTER_AUTH_URL, or from Netlify's `URL` captured at build time.
 * Netlify deploy previews and branch deploys (`<name>--<site>.netlify.app`) are allowed too,
 * so auth works on every deploy without extra config.
 */
const siteUrl = process.env.BETTER_AUTH_URL || process.env.NETLIFY_SITE_URL || "http://localhost:3000";
const allowedHosts = [new URL(siteUrl).host];
if (process.env.NETLIFY_SITE_NAME) {
  allowedHosts.push(`${process.env.NETLIFY_SITE_NAME}.netlify.app`, `*--${process.env.NETLIFY_SITE_NAME}.netlify.app`);
}
if (process.env.NODE_ENV !== "production") allowedHosts.push("localhost:*", "127.0.0.1:*");

export const auth = betterAuth({
  appName: "OmniKinkList",
  baseURL: { allowedHosts, fallback: siteUrl },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
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
