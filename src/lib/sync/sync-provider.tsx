"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { mergeSnapshot, onLocalChange, snapshotStore, type StoreSnapshot } from "@/lib/kinks/store";
import { deleteVault, getVault, putVault, type VaultRecord } from "./actions";
import {
  decryptJson,
  deriveKey,
  encryptJson,
  forgetKey,
  loadKey,
  PBKDF2_ITERATIONS,
  randomSalt,
  rememberKey,
  WrongPassphraseError,
} from "./crypto";

/**
 * Keeps local answers in sync with the vault of the signed-in account. The vault is readable by
 * the server unless the person adds a passphrase, which encrypts it end to end.
 *
 * - "signed-out": no account, nothing to do
 * - "checking":   looking for a vault and a remembered key
 * - "off":        signed in, sync never turned on
 * - "locked":     an encrypted vault exists but this device doesn't know the passphrase yet
 * - "paused":     this device used encryption, but the vault is now readable; waits for confirmation
 *                 before uploading readable answers
 * - "on":         syncing; local changes are pushed a few seconds after they happen
 */
export type SyncStatus = "signed-out" | "checking" | "off" | "locked" | "paused" | "on" | "error";

interface SyncApi {
  status: SyncStatus;
  /** Whether the vault is end-to-end encrypted, while sync is on. */
  encrypted: boolean;
  lastSyncedAt: string | null;
  busy: boolean;
  /** Turns sync on, encrypted when a passphrase is given. */
  enable: (passphrase: string | null) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  /** Encrypts the vault with a new passphrase, or stores it readable when `null`. */
  setPassphrase: (passphrase: string | null) => Promise<void>;
  /** Resumes a paused sync without encryption. */
  continueUnencrypted: () => Promise<void>;
  syncNow: () => Promise<void>;
  disable: () => Promise<void>;
  forgetDevice: () => Promise<void>;
}

const SyncContext = createContext<SyncApi | null>(null);
const PUSH_DELAY_MS = 2500;
const MAX_CONFLICT_RETRIES = 3;

interface Encryption {
  key: CryptoKey;
  salt: string;
  iterations: number;
}

interface Active {
  version: number;
  /** Null when the vault is stored readable. */
  encryption: Encryption | null;
}

/** The key this device holds for the active vault, if it is encrypted. */
const heldKey = (state: Active) => state.encryption?.key ?? null;

/** A vault this device knew as encrypted came back readable. */
class EncryptionRemovedError extends Error {}

/** Failures that mean another device changed the vault's encryption, rather than a network or server error. */
const isEncryptionChange = (error: unknown) => error instanceof WrongPassphraseError || error instanceof EncryptionRemovedError;

async function newEncryption(passphrase: string): Promise<Encryption> {
  const salt = randomSalt();
  return { key: await deriveKey(passphrase, salt, PBKDF2_ITERATIONS), salt, iterations: PBKDF2_ITERATIONS };
}

async function payload(encryption: Encryption | null) {
  if (!encryption) return { encrypted: false as const, snapshot: snapshotStore() };
  const { ciphertext, iv } = await encryptJson(encryption.key, snapshotStore());
  return { encrypted: true as const, ciphertext, iv, salt: encryption.salt, iterations: encryption.iterations };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id ?? null;
  // Status is tracked per user, so switching accounts falls back to "checking" without an extra render.
  const [tracked, setTracked] = useState<{ userId: string | null; status: SyncStatus }>({ userId: null, status: "checking" });
  const [encrypted, setEncrypted] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef<Active | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status: SyncStatus = isPending ? "checking" : !userId ? "signed-out" : tracked.userId === userId ? tracked.status : "checking";
  const setStatus = useCallback((next: SyncStatus) => setTracked({ userId, status: next }), [userId]);

  const activate = useCallback((next: Active | null) => {
    active.current = next;
    setEncrypted(!!next?.encryption);
  }, []);

  /**
   * Merges a vault into local answers. `key` is the one this device holds for the account, if any:
   * without the right key an encrypted vault throws `WrongPassphraseError`, and a readable vault
   * throws `EncryptionRemovedError` when a key is held.
   */
  const pull = useCallback(
    async (vault: VaultRecord, key: CryptoKey | null) => {
      if (vault.encrypted) {
        if (!key) throw new WrongPassphraseError("This device has no key for the vault");
        mergeSnapshot(await decryptJson<StoreSnapshot>(key, vault.ciphertext, vault.iv));
        activate({ version: vault.version, encryption: { key, salt: vault.salt, iterations: vault.iterations } });
      } else {
        if (key) throw new EncryptionRemovedError("The vault is no longer encrypted");
        mergeSnapshot(vault.snapshot);
        activate({ version: vault.version, encryption: null });
      }
      setLastSyncedAt(vault.updatedAt);
    },
    [activate],
  );

  /** Uploads local answers, merging and retrying when another device synced first. */
  const push = useCallback(async () => {
    for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
      const state = active.current;
      if (!state) return;
      const result = await putVault({ ...(await payload(state.encryption)), baseVersion: state.version });
      if (result.ok) {
        state.version = result.version;
        setLastSyncedAt(result.updatedAt);
        return;
      }
      if (result.reason === "rate-limited") return;
      if (result.reason !== "conflict") throw new Error(`Sync failed: ${result.reason}`);
      // Another device synced first: merge its data, then try again on top of the newer version.
      await pull(result.current, heldKey(state));
    }
  }, [pull]);

  /** Overwrites the vault with local answers under new encryption settings. */
  const replace = useCallback(
    async (encryption: Encryption | null) => {
      const result = await putVault({ ...(await payload(encryption)), baseVersion: active.current?.version ?? 0, force: true });
      if (!result.ok) throw new Error(`Sync failed: ${result.reason}`);
      activate({ version: result.version, encryption });
      setLastSyncedAt(result.updatedAt);
    },
    [activate],
  );

  /** Stops syncing after a failure, or asks again when another device changed the encryption. */
  const fail = useCallback(
    async (error: unknown) => {
      if (error instanceof WrongPassphraseError) {
        activate(null);
        if (userId) await forgetKey(userId);
        setStatus("locked");
      } else if (error instanceof EncryptionRemovedError) {
        activate(null);
        setStatus("paused");
      } else {
        setStatus("error");
      }
    },
    [activate, userId, setStatus],
  );

  // Figure out the state whenever the signed-in user changes.
  useEffect(() => {
    if (isPending || !userId) return;
    let cancelled = false;
    active.current = null;
    const done = (next: SyncStatus) => !cancelled && setTracked({ userId, status: next });
    (async () => {
      const [vault, key] = await Promise.all([getVault(), loadKey(userId)]);
      if (cancelled) return;
      if (!vault) {
        if (key) await forgetKey(userId);
        return done("off");
      }
      if (vault.encrypted && !key) return done("locked");
      await pull(vault, key);
      done("on");
      if (!cancelled) await push();
    })().catch(async (error) => {
      if (!cancelled) await fail(error);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isPending, pull, push, fail]);

  // Push local changes a moment after they happen, and pull when coming back to the tab.
  useEffect(() => {
    if (status !== "on") return;
    const stop = onLocalChange(() => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        pushTimer.current = null;
        push().catch(fail);
      }, PUSH_DELAY_MS);
    });
    const onVisible = () => {
      const state = active.current;
      if (document.visibilityState !== "visible" || !state) return;
      getVault()
        .then((vault) => (vault && vault.version !== state.version ? pull(vault, heldKey(state)) : undefined))
        .catch(async (error) => {
          // Network hiccups are ignored here; the next push reports real failures.
          if (isEncryptionChange(error)) await fail(error);
        });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, push, pull, fail]);

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
      encrypted,
      lastSyncedAt,
      busy,
      enable: (passphrase) =>
        withBusy(async () => {
          if (!userId) return;
          const encryption = passphrase ? await newEncryption(passphrase) : null;
          await replace(encryption);
          if (encryption) await rememberKey(userId, encryption.key);
          setStatus("on");
        }),
      unlock: (passphrase) =>
        withBusy(async () => {
          if (!userId) return;
          const vault = await getVault();
          if (!vault) return setStatus("off");
          const key = vault.encrypted ? await deriveKey(passphrase, vault.salt, vault.iterations) : null;
          await pull(vault, key);
          if (key) await rememberKey(userId, key);
          setStatus("on");
          await push().catch(fail);
        }),
      setPassphrase: (passphrase) =>
        withBusy(async () => {
          const state = active.current;
          if (!userId || !state) return;
          // Merge what other devices synced first, since the vault is about to be overwritten.
          const vault = await getVault();
          if (vault && vault.version !== state.version) await pull(vault, heldKey(state));
          const encryption = passphrase ? await newEncryption(passphrase) : null;
          await replace(encryption);
          if (encryption) await rememberKey(userId, encryption.key);
          else await forgetKey(userId);
        }),
      continueUnencrypted: () =>
        withBusy(async () => {
          if (!userId) return;
          await forgetKey(userId);
          const vault = await getVault();
          if (!vault) return setStatus("off");
          try {
            await pull(vault, null);
          } catch (error) {
            return fail(error);
          }
          setStatus("on");
          await push().catch(fail);
        }),
      syncNow: () =>
        withBusy(async () => {
          const state = active.current;
          if (!state) return;
          try {
            const vault = await getVault();
            if (vault) await pull(vault, heldKey(state));
            await push();
          } catch (error) {
            await fail(error);
            throw error;
          }
        }),
      disable: () =>
        withBusy(async () => {
          await deleteVault();
          await forgetKey(userId ?? undefined);
          activate(null);
          setLastSyncedAt(null);
          setStatus("off");
        }),
      forgetDevice: async () => {
        await forgetKey(userId ?? undefined);
        activate(null);
      },
    }),
    [status, encrypted, lastSyncedAt, busy, withBusy, userId, push, pull, replace, fail, activate, setStatus],
  );

  return <SyncContext value={api}>{children}</SyncContext>;
}

export function useSync() {
  const value = use(SyncContext);
  if (!value) throw new Error("useSync must be used inside SyncProvider");
  return value;
}
