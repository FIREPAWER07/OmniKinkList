"use client";

import { IconContext } from "@phosphor-icons/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <IconContext.Provider value={{ weight: "regular" }}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: "!rounded-xl !border-border !bg-surface !text-fg !shadow-lg",
          }}
        />
      </IconContext.Provider>
    </ThemeProvider>
  );
}
