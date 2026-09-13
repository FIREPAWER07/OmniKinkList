import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./i18n/config";

function preferredLocale(request: NextRequest): Locale | null {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const header = request.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.map((r) => r.lang).find(isLocale) ?? null;
}

/**
 * English is served without a prefix (`/import`), other languages with one (`/it/import`).
 * Internally every page lives under `app/[locale]`, so unprefixed paths are rewritten to `/en`.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(first)) return NextResponse.next();

  if (pathname === "/") {
    const preferred = preferredLocale(request);
    if (preferred && preferred !== DEFAULT_LOCALE) {
      return NextResponse.redirect(new URL(`/${preferred}${search}`, request.url));
    }
  }
  return NextResponse.rewrite(new URL(`/${DEFAULT_LOCALE}${pathname}${search}`, request.url));
}

export const config = {
  // Skip API routes, Next internals, and files with an extension (icons, images).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
