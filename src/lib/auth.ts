import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { captcha, genericOAuth, twoFactor } from "better-auth/plugins";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateUsername } from "./account/profile";
import { authEmail, sendEmail, signInCodeEmail } from "./email";
import { BANNED_ERROR_CODE, isBanActive } from "./moderation";
import { SITE_URL } from "./site-url";

/** Netlify deploy previews and branch deploys (`<name>--<site>.netlify.app`) are allowed besides the site URL. */
const allowedHosts = [new URL(SITE_URL).host];
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

/** How long an emailed two-factor code stays valid. */
const EMAIL_CODE_MINUTES = 5;

/** The `locale` field added to users below, which Better Auth's hook types don't include. */
const localeOf = (user: object) => (user as { locale?: string }).locale;

/** Whether the account's second factor is an authenticator app. Accounts with 2FA on and no app get codes by email. */
export async function usesAuthenticatorApp(userId: string) {
  const [row] = await db
    .select({ id: schema.twoFactor.id })
    .from(schema.twoFactor)
    // Better Auth treats a missing `verified` as verified; `false` is an app setup that was never confirmed.
    .where(and(eq(schema.twoFactor.userId, userId), or(eq(schema.twoFactor.verified, true), isNull(schema.twoFactor.verified))));
  return !!row;
}

export const auth = betterAuth({
  appName: "OmniKinkList",
  baseURL: { allowedHosts, fallback: SITE_URL },
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: emailVerificationRequired,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(authEmail("reset", user.email, url, localeOf(user)));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(authEmail("verify", user.email, url, localeOf(user)));
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
      // Profile fields change only through `updateProfile`, which validates them and checks the username is free.
      username: { type: "string", required: false, defaultValue: generateUsername, input: false },
      bio: { type: "string", required: false, defaultValue: "", input: false },
      profilePublic: { type: "boolean", required: false, defaultValue: true, input: false },
      banned: { type: "boolean", required: false, defaultValue: false, input: false },
      banReason: { type: "string", required: false, input: false },
      banExpires: { type: "date", required: false, input: false },
    },
    deleteUser: { enabled: true },
  },
  databaseHooks: {
    session: {
      create: {
        // Every way of signing in creates a session here (password, Google, Proton, 2FA, email links), so bans are enforced in one place.
        before: async (newSession) => {
          const [row] = await db
            .select({ banned: schema.user.banned, banExpires: schema.user.banExpires })
            .from(schema.user)
            .where(eq(schema.user.id, newSession.userId));
          if (row && isBanActive(row)) throw new APIError("FORBIDDEN", { message: "This account is suspended.", code: BANNED_ERROR_CODE });
        },
      },
    },
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
      "/two-factor/send-otp": { window: 60, max: 3 },
      "/two-factor/verify-otp": { window: 60, max: 5 },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-nf-client-connection-ip", "x-forwarded-for"] },
  },
  plugins: [
    twoFactor({
      issuer: "OmniKinkList",
      allowPasswordless: true,
      otpOptions: {
        period: EMAIL_CODE_MINUTES,
        storeOTP: "hashed",
        sendOTP: async ({ user, otp }) => {
          // Better Auth offers emailed codes to every account with 2FA on. Accounts with an authenticator app never get
          // one, so someone who gets into their email still can't pass the second step.
          if (await usesAuthenticatorApp(user.id)) return;
          await sendEmail(signInCodeEmail(user.email, otp, EMAIL_CODE_MINUTES, localeOf(user)));
        },
      },
    }),
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
