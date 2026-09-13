"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useLocale, useT } from "@/i18n/client";
import { submitSuggestion } from "@/lib/suggestions/actions";
import { Turnstile } from "./turnstile";

interface ListOption {
  slug: string;
  name: string;
  categories: { id: number; name: string }[];
}

const split = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

export function SuggestForm({ lists }: { lists: ListOption[] }) {
  const t = useT();
  const locale = useLocale();
  const [slug, setSlug] = useState(lists[lists.length - 1]?.slug ?? "");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const list = lists.find((l) => l.slug === slug);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    startTransition(async () => {
      const result = await submitSuggestion({
        listSlug: slug,
        categoryId: form.get("category") ? Number(form.get("category")) : null,
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        roles: split(form.get("roles")),
        variants: split(form.get("variants")),
        comment: String(form.get("comment") ?? ""),
        website: String(form.get("website") ?? ""),
        locale,
        captchaToken: token,
      });
      if (result.ok) {
        setSent(true);
        formElement.reset();
      } else {
        setError(t(`suggest.errors.${result.error}`));
        setResetKey((k) => k + 1);
      }
    });
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-24 text-center">
        <CheckCircleIcon size={48} weight="duotone" className="mx-auto text-accent" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("suggest.thanksTitle")}</h1>
        <p className="mt-3 text-muted">{t("suggest.thanksBody")}</p>
        <Button className="mt-8" onClick={() => setSent(false)}>
          {t("suggest.another")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("suggest.title")}</h1>
      <p className="mt-2 max-w-xl text-muted">{t("suggest.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-xl border border-border bg-surface p-5 md:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("suggest.list")} htmlFor="suggest-list">
            <Select id="suggest-list" value={slug} onChange={(e) => setSlug(e.target.value)}>
              {lists.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("suggest.category")} htmlFor="suggest-category">
            <Select id="suggest-category" name="category" key={slug} defaultValue="">
              <option value="">{t("suggest.anyCategory")}</option>
              {list?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("suggest.name")} htmlFor="suggest-name">
          <Input id="suggest-name" name="name" required maxLength={80} />
        </Field>
        <Field label={t("suggest.description")} htmlFor="suggest-description">
          <Textarea id="suggest-description" name="description" maxLength={300} rows={2} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("custom.roles")} htmlFor="suggest-roles" hint={t("custom.rolesHint")}>
            <Input id="suggest-roles" name="roles" />
          </Field>
          <Field label={t("custom.variants")} htmlFor="suggest-variants" hint={t("custom.variantsHint")}>
            <Input id="suggest-variants" name="variants" />
          </Field>
        </div>
        <Field label={t("suggest.comment")} htmlFor="suggest-comment" hint={t("suggest.commentHint")}>
          <Textarea id="suggest-comment" name="comment" maxLength={500} rows={2} />
        </Field>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <Turnstile onToken={setToken} resetKey={resetKey} />
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? t("common.sending") : t("suggest.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
