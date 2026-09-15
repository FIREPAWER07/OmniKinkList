"use client";

import { createContext, use, useEffect, useId, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const MenuContext = createContext<{ open: boolean; toggle: () => void; close: () => void; id: string } | null>(null);

/** Small popover menu: click trigger, closes on outside click, Escape, or picking an item. */
export function Menu({
  label,
  trigger,
  children,
  align = "right",
  className,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const context = useMemo(() => ({ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false), id }), [open, id]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <MenuContext value={context}>
      <div ref={ref} className="relative">
        {trigger}
        {open && (
          <div
            id={id}
            role="menu"
            aria-label={label}
            className={cn(
              "absolute top-11 z-50 w-64 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/20",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </div>
        )}
      </div>
    </MenuContext>
  );
}

function useMenu() {
  const value = use(MenuContext);
  if (!value) throw new Error("Menu parts must be inside <Menu>");
  return value;
}

export function MenuButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggle, id } = useMenu();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onClick={toggle}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MenuItem({
  onSelect,
  className,
  children,
  keepOpen,
}: {
  onSelect: () => void;
  className?: string;
  children: ReactNode;
  keepOpen?: boolean;
}) {
  const { close } = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect();
        if (!keepOpen) close();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
