"use client";

import { ProhibitIcon, SignOutIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { banUser, deleteUserAccount, rejectSuggestionsFrom, revokeUserSessions, unbanUser, type ActionResult } from "@/lib/admin/actions";
import { BAN_DURATION_LABELS, BAN_DURATIONS, type BanDuration } from "@/lib/moderation";
import type { Role } from "@/lib/roles";
import { RoleSelect } from "./user-table";

interface Target {
  id: string;
  name: string;
  email: string;
  role: Role;
  banned: boolean;
  banReason: string | null;
}

type ButtonVariant = Parameters<typeof Button>[0]["variant"];

/** A button that asks before running a moderation action. */
function ConfirmAction({
  label,
  icon,
  variant = "secondary",
  title,
  description,
  confirmLabel,
  success,
  action,
  disabled,
}: {
  label: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  success: string;
  action: () => Promise<ActionResult<unknown>>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button size="sm" variant={variant} disabled={disabled} onClick={() => setOpen(true)}>
        {icon} {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action();
                if (!result.ok) return void toast.error(result.error);
                toast.success(success);
                setOpen(false);
              })
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function BanDialog({ target, pendingSuggestions, open, onClose }: { target: Target; pendingSuggestions: number; open: boolean; onClose: () => void }) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={target.banned ? `Change the ban on ${target.name}` : `Ban ${target.name}?`}
      description="They are signed out on every device and cannot sign in until the ban ends. Their synced answers are kept."
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await banUser({
              userId: target.id,
              reason: String(form.get("reason") ?? ""),
              duration: String(form.get("duration")) as BanDuration,
              rejectSuggestions: form.get("rejectSuggestions") === "on",
            });
            if (!result.ok) return setError(result.error);
            toast.success(`${target.name} is banned`);
            onClose();
          });
        }}
      >
        <Field label="Reason" htmlFor={`${id}-reason`} hint="Only admins see this. It is kept in the moderation history.">
          <Textarea id={`${id}-reason`} name="reason" required maxLength={300} defaultValue={target.banReason ?? ""} autoFocus />
        </Field>
        <Field label="Length" htmlFor={`${id}-duration`}>
          <Select id={`${id}-duration`} name="duration" defaultValue="7d">
            {BAN_DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {BAN_DURATION_LABELS[duration]}
              </option>
            ))}
          </Select>
        </Field>
        {pendingSuggestions > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="rejectSuggestions" defaultChecked className="size-4 accent-[var(--accent)]" />
            Also reject their {pendingSuggestions} pending suggestion{pendingSuggestions === 1 ? "" : "s"}
          </label>
        )}
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {target.banned ? "Save ban" : "Ban user"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ target, open, onClose }: { target: Target; open: boolean; onClose: () => void }) {
  const id = useId();
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = confirmEmail.trim().toLowerCase() === target.email.toLowerCase();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Delete ${target.name}'s account?`}
      description="This removes the account, its sign-in methods, sessions, and synced answers for good. Suggestions and editing history stay, without the name attached. It cannot be undone; to only keep someone out, ban them instead."
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await deleteUserAccount(target.id, confirmEmail);
            if (!result.ok) return void toast.error(result.error);
            toast.success(`Deleted the account of ${target.name}`);
            router.replace("/admin/users");
          });
        }}
      >
        <Field label={`Type ${target.email} to confirm`} htmlFor={`${id}-email`}>
          <Input id={`${id}-email`} value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!matches || pending}>
            Delete account
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Role, ban, and delete controls for the user page header. */
export function UserActions({ target, isSelf, pendingSuggestions }: { target: Target; isSelf: boolean; pendingSuggestions: number }) {
  const [dialog, setDialog] = useState<"ban" | "delete" | null>(null);

  if (isSelf) return <p className="text-sm text-muted">This is your account. Manage it from your account page.</p>;

  const protectedAdmin = target.role === "admin";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RoleSelect userId={target.id} name={target.name} role={target.role} />
      {target.banned && (
        <>
          <Button size="sm" variant="secondary" onClick={() => setDialog("ban")}>
            Change ban
          </Button>
          <ConfirmAction
            label="Lift ban"
            variant="primary"
            title={`Lift the ban on ${target.name}?`}
            description="They can sign in again right away."
            confirmLabel="Lift ban"
            success={`${target.name} can sign in again`}
            action={() => unbanUser(target.id)}
          />
        </>
      )}
      {protectedAdmin ? (
        <p className="text-sm text-muted">Admins cannot be banned or deleted. Change their role first.</p>
      ) : (
        <>
          {!target.banned && (
            <Button size="sm" variant="danger" onClick={() => setDialog("ban")}>
              <ProhibitIcon size={14} /> Ban
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDialog("delete")} className="hover:text-danger">
            <TrashIcon size={14} /> Delete account
          </Button>
        </>
      )}
      {/* Keyed on being open, so every time a dialog opens it starts from a fresh form. */}
      <BanDialog key={`ban-${dialog === "ban"}`} target={target} pendingSuggestions={pendingSuggestions} open={dialog === "ban"} onClose={() => setDialog(null)} />
      <DeleteDialog key={`delete-${dialog === "delete"}`} target={target} open={dialog === "delete"} onClose={() => setDialog(null)} />
    </div>
  );
}

export function SignOutEverywhere({ userId, name, count }: { userId: string; name: string; count: number }) {
  return (
    <ConfirmAction
      label="Sign out everywhere"
      icon={<SignOutIcon size={14} />}
      disabled={count === 0}
      title={`Sign ${name} out on all devices?`}
      description={`Ends ${count} active session${count === 1 ? "" : "s"}. They can sign in again unless they are banned.`}
      confirmLabel="Sign out everywhere"
      success={`${name} is signed out everywhere`}
      action={() => revokeUserSessions(userId)}
    />
  );
}

export function EndSessionButton({ userId, sessionId }: { userId: string; sessionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await revokeUserSessions(userId, sessionId);
          if (result.ok) toast.success("Session ended");
          else toast.error(result.error);
        })
      }
    >
      End session
    </Button>
  );
}

export function RejectPendingSuggestions({ userId, name, count }: { userId: string; name: string; count: number }) {
  return (
    <ConfirmAction
      label={`Reject ${count} pending`}
      title={`Reject all pending suggestions from ${name}?`}
      description={`${count} suggestion${count === 1 ? "" : "s"} will be marked as rejected without being added to any list.`}
      confirmLabel="Reject all"
      success="Suggestions rejected"
      action={() => rejectSuggestionsFrom(userId)}
    />
  );
}
