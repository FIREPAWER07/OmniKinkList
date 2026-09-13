"use client";

import { useSyncExternalStore } from "react";
import { Dialog } from "./ui/dialog";
import { Button, buttonClass } from "./ui/button";

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
      // Ignore: the gate will show again next visit.
    }
    listeners.forEach((notify) => notify());
  };

  return (
    <Dialog
      open={!ok}
      onClose={accept}
      dismissible={false}
      title="This site is for adults"
      description="OmniKinkList describes sexual activities and fetishes. You must be 18 or older to continue."
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <a href="https://www.google.com" className={buttonClass("ghost")}>
          Leave
        </a>
        <Button variant="primary" onClick={accept}>
          I am 18 or older
        </Button>
      </div>
    </Dialog>
  );
}
