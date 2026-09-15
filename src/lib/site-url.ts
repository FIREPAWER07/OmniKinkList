/**
 * The production URL comes from BETTER_AUTH_URL, or from Netlify's `URL` captured at build time
 * (see `next.config.ts`), and falls back to the local development server.
 */
export const SITE_URL = process.env.BETTER_AUTH_URL || process.env.NETLIFY_SITE_URL || "http://localhost:3000";
