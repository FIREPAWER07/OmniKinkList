"use client";

import { CheckIcon, PencilSimpleIcon, PlusIcon, TrashIcon, UserSwitchIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Menu, MenuButton, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { DEFAULT_PROFILE_ID, profileStore, useHydrated, useProfiles, type Profile } from "@/lib/kinks/store";

export function useProfileName(profile: Profile | undefined) {
  const t = useT();
  if (!profile) return t("profiles.me");
  return profile.name || (profile.id === DEFAULT_PROFILE_ID ? t("profiles.me") : t("profiles.unnamed"));
}

function ProfileLabel({ profile }: { profile: Profile }) {
  return <>{useProfileName(profile)}</>;
}

/** Switch between answer profiles stored in this browser ("Me", "Partner"). */
export function ProfileSwitcher() {
  const t = useT();
  const hydrated = useHydrated();
  const state = useProfiles();
  const active = state.profiles.find((p) => p.id === state.active);
  const activeName = useProfileName(active);
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "rename" | "delete"; profile: Profile } | null>(null);

  return (
    <>
      <Menu
        label={t("profiles.menu")}
        trigger={
          <MenuButton className="max-w-40 gap-1.5 px-2.5" aria-label={t("profiles.current", { name: activeName })} data-tooltip={t("profiles.menu")}>
            <UserSwitchIcon size={18} aria-hidden />
            <span className={cn("truncate text-sm", !hydrated && "invisible")}>{activeName}</span>
          </MenuButton>
        }
      >
        <p className="px-3 pb-1 pt-2 text-xs text-subtle">{t("profiles.hint")}</p>
        {state.profiles.map((profile) => (
          <div key={profile.id} className="group flex items-center rounded-lg hover:bg-surface-2">
            <MenuItem onSelect={() => profileStore.setActive(profile.id)} className="flex-1 hover:bg-transparent">
              <CheckIcon size={14} weight="bold" className={profile.id === state.active ? "text-accent" : "invisible"} aria-hidden />
              <span className="truncate">
                <ProfileLabel profile={profile} />
              </span>
            </MenuItem>
            <button
              type="button"
              onClick={() => setDialog({ mode: "rename", profile })}
              className="grid size-7 place-items-center rounded text-subtle hover:text-fg"
              aria-label={t("profiles.rename")}
            >
              <PencilSimpleIcon size={14} />
            </button>
            {state.profiles.length > 1 && (
              <button
                type="button"
                onClick={() => setDialog({ mode: "delete", profile })}
                className="mr-1 grid size-7 place-items-center rounded text-subtle hover:text-danger"
                aria-label={t("profiles.delete")}
              >
                <TrashIcon size={14} />
              </button>
            )}
          </div>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={() => setDialog({ mode: "create" })}>
          <PlusIcon size={14} weight="bold" aria-hidden /> {t("profiles.new")}
        </MenuItem>
      </Menu>

      <Dialog
        open={dialog?.mode === "create" || dialog?.mode === "rename"}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "rename" ? t("profiles.renameTitle") : t("profiles.newTitle")}
        description={dialog?.mode === "create" ? t("profiles.newBody") : undefined}
      >
        <ProfileNameForm
          key={dialog && dialog.mode !== "create" ? dialog.profile.id : "create"}
          initial={dialog && dialog.mode === "rename" ? dialog.profile.name : ""}
          onSubmit={(name) => {
            if (dialog?.mode === "rename") profileStore.rename(dialog.profile.id, name);
            else profileStore.create(name);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      </Dialog>

      <Dialog
        open={dialog?.mode === "delete"}
        onClose={() => setDialog(null)}
        title={t("profiles.deleteTitle")}
        description={t("profiles.deleteBody")}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDialog(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (dialog?.mode === "delete") profileStore.remove(dialog.profile.id);
              setDialog(null);
            }}
          >
            {t("profiles.deleteConfirm")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function ProfileNameForm({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (name: string) => void; onCancel: () => void }) {
  const t = useT();
  const [name, setName] = useState(initial);
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim()) onSubmit(name);
      }}
      className="grid gap-4"
    >
      <Field label={t("profiles.name")} htmlFor="profile-name">
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus placeholder={t("profiles.namePlaceholder")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
