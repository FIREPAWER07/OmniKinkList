"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isChoiceKey } from "./choices";
import { isLevel, type Answers, type Level } from "./types";

/**
 * Answers live only in the browser (localStorage), one entry per list.
 * The store keeps a parsed snapshot per list so `useSyncExternalStore`
 * gets stable references, and listens to `storage` events for cross-tab sync.
 */

const PREFIX = "okl:answers:";
const EMPTY: Answers = Object.freeze({}) as Answers;

const snapshots = new Map<string, Answers>();
const listeners = new Set<() => void>();

function storageKey(slug: string) {
  return `${PREFIX}${slug}`;
}

export function sanitizeAnswers(raw: unknown): Answers {
  const clean: Answers = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const [key, level] of Object.entries(raw as Record<string, unknown>)) {
    if (isChoiceKey(key) && isLevel(level)) clean[key] = level;
  }
  return clean;
}

function read(slug: string): Answers {
  const cached = snapshots.get(slug);
  if (cached) return cached;
  let answers = EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (raw) answers = sanitizeAnswers(JSON.parse(raw)?.answers);
  } catch {
    // Corrupt or unavailable storage: start empty.
  }
  snapshots.set(slug, answers);
  return answers;
}

function write(slug: string, answers: Answers) {
  snapshots.set(slug, answers);
  try {
    if (Object.keys(answers).length === 0) {
      window.localStorage.removeItem(storageKey(slug));
    } else {
      window.localStorage.setItem(storageKey(slug), JSON.stringify({ v: 1, updatedAt: Date.now(), answers }));
    }
  } catch {
    // Storage full or blocked; keep the in-memory copy for this session.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) {
      snapshots.clear();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

export const answersStore = {
  get: read,
  set(slug: string, key: string, level: Level | null) {
    const next = { ...read(slug) };
    if (level) next[key] = level;
    else delete next[key];
    write(slug, next);
  },
  replace(slug: string, answers: Answers) {
    write(slug, sanitizeAnswers(answers));
  },
  clear(slug: string) {
    write(slug, EMPTY);
  },
};

export function useAnswers(slug: string) {
  const answers = useSyncExternalStore(
    subscribe,
    () => read(slug),
    () => EMPTY,
  );
  const setAnswer = useCallback((key: string, level: Level | null) => answersStore.set(slug, key, level), [slug]);
  return { answers, setAnswer };
}

/** True once the component has hydrated, so saved answers can be trusted. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
