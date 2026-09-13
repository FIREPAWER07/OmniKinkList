"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { createList, saveCategory, updateList, type ActionResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";

/** Shared submit plumbing: pending state, inline error, close on success. */
export function useActionForm(onSuccess: () => void, successMessage: string) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };
  return { pending, error, setError, submit };
}

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

export function NewListButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { pending, error, submit, setError } = useActionForm(() => setOpen(false), "List created");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      slug: text(form, "slug").toLowerCase(),
      name: text(form, "name"),
      tagline: text(form, "tagline"),
      description: text(form, "description"),
    };
    submit(async () => {
      const result = await createList(input);
      if (result.ok) router.push(`/admin/lists/${input.slug}`);
      return result;
    });
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <PlusIcon size={16} weight="bold" /> New list
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        title="New list"
      >
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Name" htmlFor="new-list-name">
            <Input id="new-list-name" name="name" required maxLength={40} />
          </Field>
          <Field label="Slug" htmlFor="new-list-slug" hint="Used in the address, like /list/spicy. Cannot be changed later.">
            <Input id="new-list-slug" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,31}" className="font-mono" />
          </Field>
          <ListTextFields idPrefix="new-list" />
          <FormFooter error={error} pending={pending} onCancel={() => setOpen(false)} label="Create list" />
        </form>
      </Dialog>
    </>
  );
}

export function ListDetailsDialog({
  open,
  onClose,
  list,
}: {
  open: boolean;
  onClose: () => void;
  list: { slug: string; name: string; tagline: string; description: string };
}) {
  const { pending, error, submit } = useActionForm(onClose, "List details saved");
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit(() =>
      updateList({ slug: list.slug, name: text(form, "name"), tagline: text(form, "tagline"), description: text(form, "description") }),
    );
  };
  return (
    <Dialog open={open} onClose={onClose} title="List details">
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Name" htmlFor="list-name">
          <Input id="list-name" name="name" defaultValue={list.name} required maxLength={40} />
        </Field>
        <ListTextFields idPrefix="list" defaults={list} />
        <FormFooter error={error} pending={pending} onCancel={onClose} label="Save" />
      </form>
    </Dialog>
  );
}

function ListTextFields({ idPrefix, defaults }: { idPrefix: string; defaults?: { tagline: string; description: string } }) {
  return (
    <>
      <Field label="Tagline" htmlFor={`${idPrefix}-tagline`} hint="A short label shown next to the name.">
        <Input id={`${idPrefix}-tagline`} name="tagline" defaultValue={defaults?.tagline} maxLength={60} />
      </Field>
      <Field label="Description" htmlFor={`${idPrefix}-description`}>
        <Textarea id={`${idPrefix}-description`} name="description" defaultValue={defaults?.description} maxLength={300} rows={3} />
      </Field>
    </>
  );
}

export function CategoryDialog({
  open,
  onClose,
  listSlug,
  category,
}: {
  open: boolean;
  onClose: () => void;
  listSlug: string;
  category?: { id: number; name: string; description: string };
}) {
  const { pending, error, submit } = useActionForm(onClose, category ? "Category saved" : "Category added");
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit(() => saveCategory({ id: category?.id, listSlug, name: text(form, "name"), description: text(form, "description") }));
  };
  return (
    <Dialog open={open} onClose={onClose} title={category ? "Edit category" : "New category"}>
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Name" htmlFor="category-name">
          <Input id="category-name" name="name" defaultValue={category?.name} required maxLength={60} />
        </Field>
        <Field label="Description" htmlFor="category-description" hint="Explains what belongs in this category.">
          <Textarea id="category-description" name="description" defaultValue={category?.description} maxLength={300} rows={3} />
        </Field>
        <FormFooter error={error} pending={pending} onCancel={onClose} label={category ? "Save" : "Add category"} />
      </form>
    </Dialog>
  );
}

export function FormFooter({
  error,
  pending,
  onCancel,
  label,
}: {
  error: string | null;
  pending: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving" : label}
        </Button>
      </div>
    </>
  );
}
