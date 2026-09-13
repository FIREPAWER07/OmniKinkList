"use client";

import { IconContext } from "@phosphor-icons/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { SyncProvider } from "@/lib/sync/sync-provider";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <IconContext.Provider value={{ weight: "regular" }}>
          <SyncProvider>
            {children}
            <Toaster
              position="bottom-center"
              toastOptions={{ className: "!rounded-xl !border-border !bg-surface !text-fg !shadow-lg" }}
            />
          </SyncProvider>
        </IconContext.Provider>
      </ThemeProvider>
    </I18nProvider>
  );
}
