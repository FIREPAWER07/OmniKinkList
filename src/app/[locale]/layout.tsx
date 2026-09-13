import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AgeGate } from "@/components/age-gate";
import { LevelIconSprite } from "@/components/kinks/level";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALES, localePath } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { ACCENT_SCRIPT } from "@/lib/accent";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  const siteUrl = process.env.BETTER_AUTH_URL || process.env.NETLIFY_SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: "OmniKinkList", template: "%s | OmniKinkList" },
    description: t("meta.description"),
    alternates: {
      canonical: localePath(locale, "/"),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, "/")])),
    },
    openGraph: { siteName: "OmniKinkList", locale },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0a0d" },
    { media: "(prefers-color-scheme: light)", color: "#faf7f6" },
  ],
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCENT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <LevelIconSprite />
        <Providers locale={locale}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <AgeGate />
        </Providers>
      </body>
    </html>
  );
}
