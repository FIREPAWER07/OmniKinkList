"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Thin wrapper around the native <dialog> element (focus trap, Escape, top layer for free). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        if (dismissible && event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-surface p-0 text-fg shadow-2xl shadow-black/30",
        className,
      )}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 -mt-1 rounded-lg p-2 text-subtle hover:bg-surface-2 hover:text-fg"
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            )}
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
