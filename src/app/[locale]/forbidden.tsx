import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** Only reachable from the editor, which is English-only. */
export default function Forbidden() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-24 text-center">
      <p className="font-mono text-sm text-accent">403</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Not an editor yet</h1>
      <p className="mt-3 text-muted">You are signed in, but an admin has to give your account the editor role before you can change lists.</p>
      <Link href="/" className={buttonClass("secondary", "md", "mt-8")}>
        Back to home
      </Link>
    </div>
  );
}
