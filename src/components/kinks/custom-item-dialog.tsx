"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { listStore } from "@/lib/kinks/store";
import type { KinkItem, KinkOption, OptionKind } from "@/lib/kinks/types";

function splitLabels(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[,\n]/)
    .map((label) => label.trim().slice(0, 50))
    .filter((label) => label && !seen.has(label.toLowerCase()) && seen.add(label.toLowerCase()))
    .slice(0, 12);
}

/** Add or edit an item the person writes in themselves. Kept only in their browser. */
export function CustomItemDialog({
  open,
  onClose,
  slug,
  item,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  item?: KinkItem;
}) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} title={item ? t("custom.editTitle") : t("custom.addTitle")} description={t("custom.privacy")}>
      <CustomItemForm key={item?.id ?? "new"} slug={slug} item={item} onClose={onClose} />
    </Dialog>
  );
}

function CustomItemForm({ slug, item, onClose }: { slug: string; item?: KinkItem; onClose: () => void }) {
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const labelsOf = (kind: OptionKind) => (item?.options ?? []).filter((o) => o.kind === kind).map((o) => o.label).join(", ");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const existing = new Map((item?.options ?? []).map((o) => [`${o.kind}:${o.label.toLowerCase()}`, o.id]));
    let nextId = Math.max(0, ...(item?.options ?? []).map((o) => o.id));
    const build = (kind: OptionKind) =>
      splitLabels(String(form.get(kind) ?? "")).map<KinkOption>((label) => ({
        id: existing.get(`${kind}:${label.toLowerCase()}`) ?? ++nextId,
        label,
        kind,
      }));
    listStore.saveCustom(slug, {
      id: item?.id,
      name: name.slice(0, 80),
      description: String(form.get("description") ?? "").trim().slice(0, 300),
      options: [...build("role"), ...build("variant")],
    });
    onClose();
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label={t("custom.name")} htmlFor="custom-name">
        <Input id="custom-name" name="name" defaultValue={item?.name} required maxLength={80} autoFocus />
      </Field>
      <Field label={t("custom.description")} htmlFor="custom-description">
        <Textarea id="custom-description" name="description" defaultValue={item?.description} maxLength={300} rows={2} />
      </Field>
      <Field label={t("custom.roles")} htmlFor="custom-roles" hint={t("custom.rolesHint")}>
        <Input id="custom-roles" name="role" defaultValue={labelsOf("role")} />
      </Field>
      <Field label={t("custom.variants")} htmlFor="custom-variants" hint={t("custom.variantsHint")}>
        <Input id="custom-variants" name="variant" defaultValue={labelsOf("variant")} />
      </Field>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {item ? (
          confirmDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                listStore.removeCustom(slug, item.id);
                onClose();
              }}
            >
              {t("custom.confirmRemove")}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              {t("custom.remove")}
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
