"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { Button, buttonClass } from "./ui/button";
import { Dialog } from "./ui/dialog";

const KEY = "okl:age-confirmed";
const listeners = new Set<() => void>();

function confirmed() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function AgeGate() {
  const t = useT();
  const ok = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    confirmed,
    () => true,
  );

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // The gate shows again next visit.
    }
    listeners.forEach((notify) => notify());
  };

  return (
    <Dialog open={!ok} onClose={accept} dismissible={false} title={t("ageGate.title")} description={t("ageGate.body")}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <a href="https://www.google.com" className={buttonClass("ghost")}>
          {t("ageGate.leave")}
        </a>
        <Button variant="primary" onClick={accept}>
          {t("ageGate.confirm")}
        </Button>
      </div>
    </Dialog>
  );
}
