import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Netlify only exposes these during the build, so capture them for the auth config at runtime.
  env: {
    NETLIFY_SITE_URL: process.env.URL ?? "",
    NETLIFY_SITE_NAME: process.env.SITE_NAME ?? "",
  },
  experimental: {
    authInterrupts: true,
  },
  serverExternalPackages: ["@libsql/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
