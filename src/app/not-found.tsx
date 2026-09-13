import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">That page does not exist, or the list was renamed or removed.</p>
      <Link href="/" className={buttonClass("primary", "md", "mt-8")}>
        Back to home
      </Link>
    </div>
  );
}
