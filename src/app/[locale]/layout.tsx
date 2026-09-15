import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AgeGate } from "@/components/age-gate";
import { LevelIconSprite } from "@/components/kinks/level";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALES, localePath } from "@/i18n/config";
import { getLocale, getTranslator } from "@/i18n/server";
import { ACCENT_SCRIPT } from "@/lib/accent";
import { SITE_URL } from "@/lib/site-url";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getTranslator(locale);
  return {
    metadataBase: new URL(SITE_URL),
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
      <body className="flex min-h-dvh flex-col">
        <Script id="accent" strategy="beforeInteractive">
          {ACCENT_SCRIPT}
        </Script>
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
