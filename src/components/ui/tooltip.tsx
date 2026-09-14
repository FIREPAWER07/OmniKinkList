"use client";

import { useEffect, useRef } from "react";

const SHOW_DELAY = 450;
/** Right after a tooltip closes, the next one opens without delay, so sweeping across the raters feels instant. */
const WARM_MS = 400;
const GAP = 6;
const EDGE = 8;

/**
 * The app's single tooltip, replacing native `title` popups. Any element with `data-tooltip="..."` gets it on hover
 * (after a short delay) or on keyboard focus. Listeners are delegated to the document so thousands of raters cost
 * nothing, and `popover="manual"` puts it in the top layer, above sticky bars and open dialogs.
 */
export function TooltipLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tip = ref.current;
    if (!tip || !("showPopover" in tip)) return;
    let target: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closedAt = 0;

    const isOpen = () => tip.matches(":popover-open");

    const close = () => {
      clearTimeout(timer);
      if (!isOpen()) return;
      tip.hidePopover();
      closedAt = performance.now();
    };

    const place = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = tip;
      const above = rect.top - height - GAP >= EDGE;
      tip.style.top = `${above ? rect.top - height - GAP : rect.bottom + GAP}px`;
      tip.style.left = `${Math.min(Math.max(rect.left + rect.width / 2 - width / 2, EDGE), window.innerWidth - width - EDGE)}px`;
    };

    const open = (el: HTMLElement, instant: boolean) => {
      const text = el.dataset.tooltip;
      if (!text || !el.isConnected) return;
      tip.textContent = text;
      tip.toggleAttribute("data-instant", instant);
      // Reopen every time so the tooltip lands above a dialog that opened after it.
      if (isOpen()) tip.hidePopover();
      tip.showPopover();
      place(el);
    };

    const enter = (el: HTMLElement | null, immediate: boolean) => {
      if (el === target) return;
      clearTimeout(timer);
      target = el;
      if (!el) return close();
      const warm = isOpen() || performance.now() - closedAt < WARM_MS;
      if (immediate || warm) return open(el, warm);
      close();
      timer = setTimeout(() => open(el, false), SHOW_DELAY);
    };

    const find = (node: EventTarget | null) => (node instanceof Element ? node.closest<HTMLElement>("[data-tooltip]") : null);

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "touch") enter(find(event.target), false);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) enter(null, false);
    };
    const onFocusIn = (event: FocusEvent) => {
      const el = find(event.target);
      if (el && (event.target as Element).matches(":focus-visible")) enter(el, true);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (find(event.target) === target) enter(null, false);
    };
    // Keeps `target`, so the same element doesn't pop its tooltip back up until the pointer leaves it.
    const dismiss = () => close();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const reset = () => {
      close();
      target = null;
    };
    const onScroll = () => {
      if (target && target === document.activeElement && isOpen()) place(target);
      else reset();
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("click", dismiss, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", reset);
    window.addEventListener("blur", reset);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("click", dismiss, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return <div ref={ref} popover="manual" role="tooltip" className="tooltip" />;
}
