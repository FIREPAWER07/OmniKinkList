import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-[1fr_auto] lg:px-8">
        <div className="grid gap-3">
          <Logo />
          <p className="max-w-sm text-muted">
            Made by FIREPAWER07 and redboy4313. Open source under GPL-3.0. For adults only.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-muted sm:grid-cols-3">
          <Link href="/#lists" className="hover:text-fg">
            Lists
          </Link>
          <Link href="/import" className="hover:text-fg">
            Import
          </Link>
          <a href="https://github.com/FIREPAWER07/OmniKinkList" className="hover:text-fg">
            GitHub
          </a>
          <a href="https://github.com/FIREPAWER07/OmniKinkList/issues" className="hover:text-fg">
            Report an issue
          </a>
          <a href="https://ko-fi.com/D1D31CKA7D" className="hover:text-fg">
            Support on Ko-fi
          </a>
          <Link href="/login" className="hover:text-fg">
            Editor sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
