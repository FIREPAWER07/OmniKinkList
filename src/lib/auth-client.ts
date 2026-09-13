"use client";

import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    twoFactorClient({
      onTwoFactorRedirect() {
        const prefix = window.location.pathname.match(/^\/(it|es|de|fr)(?=\/|$)/)?.[0] ?? "";
        const next = new URLSearchParams(window.location.search).get("next");
        // A full page load, so the new session cookies are picked up by the server.
        window.location.assign(new URL(`${prefix}/two-factor${next ? `?next=${encodeURIComponent(next)}` : ""}`, window.location.origin));
      },
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
