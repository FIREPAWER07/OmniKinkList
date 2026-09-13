import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Page not found | OmniKinkList" };

/** Shown for URLs that match no route at all. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="font-mono text-sm text-accent">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-3 text-muted">That page does not exist.</p>
          <Link href="/" className="mt-8 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg">
            Back to home
          </Link>
        </div>
      </body>
    </html>
  );
}
