import Link from "next/link";
import { AccountMenu } from "./account-menu";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 lg:px-8">
        <Link href="/" className="rounded-lg" aria-label="OmniKinkList home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <Link href="/#lists" className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-fg">
            Lists
          </Link>
          <Link href="/import" className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-fg">
            Import
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
