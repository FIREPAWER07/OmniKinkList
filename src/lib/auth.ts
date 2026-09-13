import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { captcha, genericOAuth, twoFactor } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { authEmail, sendEmail } from "./email";

/** Emails in `ADMIN_EMAILS` (comma separated) become admins when they sign up. */
function isBootstrapAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/**
 * The production URL comes from BETTER_AUTH_URL, or from Netlify's `URL` captured at build time.
 * Netlify deploy previews and branch deploys (`<name>--<site>.netlify.app`) are allowed too.
 */
const siteUrl = process.env.BETTER_AUTH_URL || process.env.NETLIFY_SITE_URL || "http://localhost:3000";
const allowedHosts = [new URL(siteUrl).host];
if (process.env.NETLIFY_SITE_NAME) {
  allowedHosts.push(`${process.env.NETLIFY_SITE_NAME}.netlify.app`, `*--${process.env.NETLIFY_SITE_NAME}.netlify.app`);
}
if (process.env.NODE_ENV !== "production") allowedHosts.push("localhost:*", "127.0.0.1:*");

const socialProviders: BetterAuthOptions["socialProviders"] = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
}

export type SocialProvider = "google" | "simplelogin";

/** Proton has no public "Sign in with Proton"; SimpleLogin (by Proton) lets people use their Proton account. */
const simpleLoginEnabled = !!(process.env.SIMPLELOGIN_CLIENT_ID && process.env.SIMPLELOGIN_CLIENT_SECRET);

export const enabledSocialProviders: SocialProvider[] = [
  ...(socialProviders.google ? (["google"] as const) : []),
  ...(simpleLoginEnabled ? (["simplelogin"] as const) : []),
];

export const emailVerificationRequired = process.env.REQUIRE_EMAIL_VERIFICATION !== "false";


export const auth = betterAuth({
  appName: "OmniKinkList",
  baseURL: { allowedHosts, fallback: siteUrl },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: emailVerificationRequired,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(authEmail("reset", user.email, url, (user as { locale?: string }).locale));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(authEmail("verify", user.email, url, (user as { locale?: string }).locale));
    },
  },
  socialProviders,
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
      locale: { type: "string", required: false, defaultValue: "en", input: true },
    },
    deleteUser: { enabled: true },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 10 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-nf-client-connection-ip", "x-forwarded-for"] },
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
  plugins: [
    twoFactor({ issuer: "OmniKinkList", allowPasswordless: true }),
    genericOAuth({
      config: simpleLoginEnabled
        ? [
            {
              providerId: "simplelogin",
              discoveryUrl: "https://app.simplelogin.io/.well-known/openid-configuration",
              clientId: process.env.SIMPLELOGIN_CLIENT_ID!,
              clientSecret: process.env.SIMPLELOGIN_CLIENT_SECRET!,
              scopes: ["openid", "email", "profile"],
            },
          ]
        : [],
    }),
    captcha({
      provider: "cloudflare-turnstile",
      // Without a secret (local development) no endpoint is protected.
      secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
      endpoints: process.env.TURNSTILE_SECRET_KEY ? ["/sign-up/email", "/sign-in/email", "/request-password-reset"] : ["/__captcha-disabled"],
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
