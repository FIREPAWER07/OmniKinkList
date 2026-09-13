"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { mergeSnapshot, onLocalChange, snapshotStore, type StoreSnapshot } from "@/lib/kinks/store";
import { deleteVault, getVault, putVault, type VaultRecord } from "./actions";
import { decryptJson, deriveKey, encryptJson, forgetKey, loadKey, PBKDF2_ITERATIONS, randomSalt, rememberKey } from "./crypto";

/**
 * Keeps local answers in sync with the encrypted vault of the signed-in account.
 *
 * - "signed-out": no account, nothing to do
 * - "checking":   looking for a vault and a remembered key
 * - "off":        signed in, sync never turned on
 * - "locked":     a vault exists but this device doesn't know the passphrase yet
 * - "on":         unlocked; local changes are pushed a few seconds after they happen
 */
export type SyncStatus = "signed-out" | "checking" | "off" | "locked" | "on" | "error";

interface SyncApi {
  status: SyncStatus;
  lastSyncedAt: string | null;
  busy: boolean;
  enable: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  changePassphrase: (passphrase: string) => Promise<void>;
  syncNow: () => Promise<void>;
  disable: () => Promise<void>;
  forgetDevice: () => Promise<void>;
}

const SyncContext = createContext<SyncApi | null>(null);
const PUSH_DELAY_MS = 2500;
const MAX_CONFLICT_RETRIES = 3;

interface Unlocked {
  key: CryptoKey;
  salt: string;
  iterations: number;
  version: number;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id ?? null;
  // Status is tracked per user, so switching accounts falls back to "checking" without an extra render.
  const [tracked, setTracked] = useState<{ userId: string | null; status: SyncStatus }>({ userId: null, status: "checking" });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unlocked = useRef<Unlocked | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status: SyncStatus = isPending ? "checking" : !userId ? "signed-out" : tracked.userId === userId ? tracked.status : "checking";
  const setStatus = useCallback((next: SyncStatus) => setTracked({ userId, status: next }), [userId]);

  const pull = useCallback(async (vault: VaultRecord, key: CryptoKey) => {
    const remote = await decryptJson<StoreSnapshot>(key, vault.ciphertext, vault.iv);
    mergeSnapshot(remote);
    unlocked.current = { key, salt: vault.salt, iterations: vault.iterations, version: vault.version };
    setLastSyncedAt(vault.updatedAt);
  }, []);

  const push = useCallback(
    async (force = false) => {
      for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
        const state = unlocked.current;
        if (!state) return;
        const { ciphertext, iv } = await encryptJson(state.key, snapshotStore());
        const result = await putVault({ ciphertext, iv, salt: state.salt, iterations: state.iterations, baseVersion: state.version, force });
        if (result.ok) {
          state.version = result.version;
          setLastSyncedAt(result.updatedAt);
          return;
        }
        if (result.reason !== "conflict") {
          if (result.reason !== "rate-limited") setStatus("error");
          return;
        }
        // Another device synced first: merge its data, then try again on top of the newer version.
        await pull(result.current, state.key);
      }
    },
    [pull, setStatus],
  );

  // Figure out the state whenever the signed-in user changes.
  useEffect(() => {
    if (isPending || !userId) return;
    let cancelled = false;
    unlocked.current = null;
    const done = (next: SyncStatus) => !cancelled && setTracked({ userId, status: next });
    (async () => {
      const [vault, key] = await Promise.all([getVault(), loadKey(userId)]);
      if (!vault) {
        if (key) await forgetKey(userId);
        return done("off");
      }
      if (!key) return done("locked");
      try {
        await pull(vault, key);
        done("on");
        if (!cancelled) await push();
      } catch {
        await forgetKey(userId);
        done("locked");
      }
    })().catch(() => done("error"));
    return () => {
      cancelled = true;
    };
  }, [userId, isPending, pull, push]);

  // Push local changes a moment after they happen, and pull when coming back to the tab.
  useEffect(() => {
    if (status !== "on") return;
    const stop = onLocalChange(() => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        pushTimer.current = null;
        push().catch(() => setStatus("error"));
      }, PUSH_DELAY_MS);
    });
    const onVisible = async () => {
      if (document.visibilityState !== "visible" || !unlocked.current) return;
      const vault = await getVault();
      if (vault && vault.version !== unlocked.current.version) await pull(vault, unlocked.current.key);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, push, pull, setStatus]);

  const withBusy = useCallback(async (run: () => Promise<void>) => {
    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
    }
  }, []);

  const api = useMemo<SyncApi>(
    () => ({
      status,
      lastSyncedAt,
      busy,
      enable: (passphrase) =>
        withBusy(async () => {
          if (!userId) return;
          const salt = randomSalt();
          const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
          const existing = await getVault();
          unlocked.current = { key, salt, iterations: PBKDF2_ITERATIONS, version: existing?.version ?? 0 };
          await push(true);
          await rememberKey(userId, key);
          setStatus("on");
        }),
      unlock: (passphrase) =>
        withBusy(async () => {
          if (!userId) return;
          const vault = await getVault();
          if (!vault) return setStatus("off");
          const key = await deriveKey(passphrase, vault.salt, vault.iterations);
          await pull(vault, key);
          await rememberKey(userId, key);
          setStatus("on");
          await push();
        }),
      changePassphrase: (passphrase) =>
        withBusy(async () => {
          if (!userId || !unlocked.current) return;
          const salt = randomSalt();
          const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
          unlocked.current = { ...unlocked.current, key, salt, iterations: PBKDF2_ITERATIONS };
          await push(true);
          await rememberKey(userId, key);
        }),
      syncNow: () =>
        withBusy(async () => {
          if (!unlocked.current) return;
          const vault = await getVault();
          if (vault) await pull(vault, unlocked.current.key);
          await push();
        }),
      disable: () =>
        withBusy(async () => {
          await deleteVault();
          await forgetKey(userId ?? undefined);
          unlocked.current = null;
          setLastSyncedAt(null);
          setStatus("off");
        }),
      forgetDevice: async () => {
        await forgetKey(userId ?? undefined);
        unlocked.current = null;
      },
    }),
    [status, lastSyncedAt, busy, withBusy, userId, push, pull, setStatus],
  );

  return <SyncContext value={api}>{children}</SyncContext>;
}

export function useSync() {
  const value = use(SyncContext);
  if (!value) throw new Error("useSync must be used inside SyncProvider");
  return value;
}
