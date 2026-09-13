import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translator";

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const escape = (value: string) => value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/**
 * Sends email through Resend when `RESEND_API_KEY` is set. Without it (local development)
 * the message is printed to the server console instead, links included.
 */
export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") console.warn("RESEND_API_KEY is not set; email not sent:", email.subject);
    console.info(`\n--- Email to ${email.to} ---\n${email.subject}\n\n${email.text}\n---\n`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "OmniKinkList <no-reply@omnikinklist.app>",
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!response.ok) throw new Error(`Email failed: ${response.status} ${await response.text()}`);
}

function layout(title: string, body: string, button: string, url: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#0c0a0d;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#f4eff2">
<div style="max-width:480px;margin:0 auto;padding:40px 24px">
<p style="font-weight:600;font-size:18px;margin:0 0 32px">Omni<span style="color:#ff4f8b">Kink</span>List</p>
<h1 style="font-size:22px;margin:0 0 12px">${escape(title)}</h1>
<p style="color:#b1a7ae;line-height:1.6;margin:0 0 28px">${escape(body)}</p>
<a href="${escape(url)}" style="display:inline-block;background:#ff4f8b;color:#16070d;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px">${escape(button)}</a>
<p style="color:#7d737a;font-size:13px;line-height:1.6;margin:32px 0 0">${escape(footer)}</p>
</div></body></html>`;
}

export function authEmail(kind: "verify" | "reset", to: string, url: string, locale: unknown) {
  const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = createTranslator(lang, MESSAGES[lang], MESSAGES[DEFAULT_LOCALE]);
  const title = t(`email.${kind}Title`);
  const body = t(`email.${kind}Body`);
  const button = t(`email.${kind}Button`);
  const footer = t("email.ignore");
  return {
    to,
    subject: t(`email.${kind}Subject`),
    text: `${title}\n\n${body}\n\n${url}\n\n${footer}`,
    html: layout(title, body, button, url, footer),
  };
}
