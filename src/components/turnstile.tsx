"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/i18n/client";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget. Renders nothing when no site key is configured
 * (local development), in which case the server skips verification too.
 */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string) => void; resetKey?: number }) {
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: locale,
        theme: "auto",
        callback: (token: string) => callback.current(token),
        "expired-callback": () => callback.current(""),
        "error-callback": () => callback.current(""),
      });
    });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [locale]);

  useEffect(() => {
    if (resetKey && widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={container} className="min-h-[65px]" />;
}
