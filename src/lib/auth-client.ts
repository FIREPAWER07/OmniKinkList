"use client";

import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { localePath, stripLocale } from "@/i18n/config";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    twoFactorClient({
      async onTwoFactorRedirect({ twoFactorMethods }): Promise<void> {
        const { locale } = stripLocale(window.location.pathname);
        const next = new URLSearchParams(window.location.search).get("next");
        const params = new URLSearchParams();
        if (next) params.set("next", next);
        // Emailed codes are offered to every account; only accounts without an authenticator app use them.
        if (twoFactorMethods?.includes("otp") && !twoFactorMethods.includes("totp")) {
          params.set("method", "email");
          // Sent here rather than when the page loads, so reloading the page doesn't replace the code.
          await authClient.twoFactor.sendOtp();
        }
        // A full page load, so the new session cookies are picked up by the server.
        const query = params.toString() ? `?${params}` : "";
        window.location.assign(new URL(`${localePath(locale, "/two-factor")}${query}`, window.location.origin));
      },
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
