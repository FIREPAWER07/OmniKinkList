"use client";

import { useCallback, useSyncExternalStore } from "react";
import { emptyListData, isEmptyListData, nextCustomId, sanitizeListData, setKey } from "./list-data";
import type { CustomItem, Experience, Level, ListData } from "./types";

/**
 * Everything a person answers lives in localStorage, split into profiles ("Me", "Partner").
 *
 *   okl:profiles                  { active, profiles, deleted, updatedAt }
 *   okl:data:<profileId>:<slug>   ListData
 *
 * The store caches parsed snapshots so `useSyncExternalStore` gets stable references,
 * and listens to `storage` events so other tabs stay in sync.
 */

export interface Profile {
  id: string;
  name: string;
  updatedAt: number;
}

export interface ProfilesState {
  active: string;
  profiles: Profile[];
  /** Deleted profile ids with deletion time, so sync does not bring them back. */
  deleted: Record<string, number>;
  updatedAt: number;
}

export const DEFAULT_PROFILE_ID = "me";
const PROFILES_KEY = "okl:profiles";
const DATA_PREFIX = "okl:data:";
const LEGACY_PREFIX = "okl:answers:";
const PROFILE_NAME_MAX = 40;

const defaultProfile = (updatedAt: number): Profile => ({ id: DEFAULT_PROFILE_ID, name: "", updatedAt });

const EMPTY_DATA: ListData = Object.freeze(emptyListData()) as ListData;
const SERVER_PROFILES: ProfilesState = Object.freeze({
  active: DEFAULT_PROFILE_ID,
  profiles: [defaultProfile(0)],
  deleted: {},
  updatedAt: 0,
}) as ProfilesState;

const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();
const changeListeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown | null) {
  try {
    if (value === null) storage()?.removeItem(key);
    else storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep the in-memory copy for this session.
  }
}

function notify(localChange: boolean) {
  listeners.forEach((listener) => listener());
  if (localChange) changeListeners.forEach((listener) => listener());
}

function dataKey(profileId: string, slug: string) {
  return `${DATA_PREFIX}${profileId}:${slug}`;
}

function dataKeys() {
  const store = storage();
  if (!store) return [];
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(DATA_PREFIX)) keys.push(key);
  }
  return keys;
}

function profileDataKeys(profileId: string, keys = dataKeys()) {
  const prefix = `${DATA_PREFIX}${profileId}:`;
  return keys.filter((key) => key.startsWith(prefix));
}

const cleanName = (name: string) => name.trim().slice(0, PROFILE_NAME_MAX);

function sanitizeProfiles(raw: unknown): ProfilesState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<ProfilesState>;
  const profiles = (Array.isArray(value.profiles) ? value.profiles : [])
    .filter((p): p is Profile => !!p && typeof p.id === "string" && /^[\w-]{1,40}$/.test(p.id))
    .map((p) => ({ id: p.id, name: typeof p.name === "string" ? p.name.slice(0, PROFILE_NAME_MAX) : "", updatedAt: Number(p.updatedAt) || 0 }));
  if (profiles.length === 0) return null;
  const active = profiles.some((p) => p.id === value.active) ? value.active! : profiles[0].id;
  const deleted: Record<string, number> = {};
  if (value.deleted && typeof value.deleted === "object") {
    for (const [id, at] of Object.entries(value.deleted)) if (typeof at === "number") deleted[id] = at;
  }
  return { active, profiles, deleted, updatedAt: Number(value.updatedAt) || 0 };
}

/** Moves answers saved before profiles existed into the default profile. */
function migrateLegacy() {
  const store = storage();
  if (!store) return;
  for (let i = store.length - 1; i >= 0; i--) {
    const key = store.key(i);
    if (!key?.startsWith(LEGACY_PREFIX)) continue;
    const slug = key.slice(LEGACY_PREFIX.length);
    const legacy = readJson(key) as { answers?: unknown; updatedAt?: number } | null;
    if (legacy && !store.getItem(dataKey(DEFAULT_PROFILE_ID, slug))) {
      writeJson(dataKey(DEFAULT_PROFILE_ID, slug), sanitizeListData({ answers: legacy.answers, updatedAt: legacy.updatedAt ?? Date.now() }));
    }
    store.removeItem(key);
  }
}

function getProfiles(): ProfilesState {
  if (!storage()) return SERVER_PROFILES;
  const cached = cache.get(PROFILES_KEY) as ProfilesState | undefined;
  if (cached) return cached;
  let state = sanitizeProfiles(readJson(PROFILES_KEY));
  if (!state) {
    migrateLegacy();
    state = { active: DEFAULT_PROFILE_ID, profiles: [defaultProfile(0)], deleted: {}, updatedAt: 0 };
    writeJson(PROFILES_KEY, state);
  }
  cache.set(PROFILES_KEY, state);
  return state;
}

function setProfiles(state: ProfilesState, localChange = true) {
  cache.set(PROFILES_KEY, state);
  writeJson(PROFILES_KEY, state);
  notify(localChange);
}

function getData(profileId: string, slug: string): ListData {
  if (!storage()) return EMPTY_DATA;
  const key = dataKey(profileId, slug);
  const cached = cache.get(key) as ListData | undefined;
  if (cached) return cached;
  const raw = readJson(key);
  const data = raw ? sanitizeListData(raw) : EMPTY_DATA;
  cache.set(key, data);
  return data;
}

function setData(profileId: string, slug: string, data: ListData, localChange = true) {
  const key = dataKey(profileId, slug);
  cache.set(key, data);
  writeJson(key, isEmptyListData(data) && !data.lastVisitAt ? null : data);
  notify(localChange);
}

/** One `storage` listener for the whole store, attached while anything is subscribed. */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== PROFILES_KEY && !event.key.startsWith(DATA_PREFIX)) return;
  cache.clear();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function randomId() {
  return `p${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const profileStore = {
  get: getProfiles,
  create(name: string) {
    const state = getProfiles();
    const now = Date.now();
    const profile = { id: randomId(), name: cleanName(name), updatedAt: now };
    setProfiles({ ...state, profiles: [...state.profiles, profile], active: profile.id, updatedAt: now });
    return profile;
  },
  rename(id: string, name: string) {
    const state = getProfiles();
    const now = Date.now();
    setProfiles({
      ...state,
      profiles: state.profiles.map((p) => (p.id === id ? { ...p, name: cleanName(name), updatedAt: now } : p)),
      updatedAt: now,
    });
  },
  setActive(id: string) {
    const state = getProfiles();
    if (state.profiles.some((p) => p.id === id)) setProfiles({ ...state, active: id });
  },
  remove(id: string) {
    const state = getProfiles();
    if (state.profiles.length <= 1) return;
    const now = Date.now();
    for (const key of profileDataKeys(id)) {
      cache.delete(key);
      writeJson(key, null);
    }
    const profiles = state.profiles.filter((p) => p.id !== id);
    setProfiles({
      active: state.active === id ? profiles[0].id : state.active,
      profiles,
      deleted: { ...state.deleted, [id]: now },
      updatedAt: now,
    });
  },
};

function update(slug: string, change: (data: ListData) => ListData, profileId = getProfiles().active) {
  const next = change(getData(profileId, slug));
  setData(profileId, slug, { ...next, updatedAt: Date.now() });
}

export const listStore = {
  get: (slug: string, profileId = getProfiles().active) => getData(profileId, slug),
  replace(slug: string, data: ListData, profileId?: string) {
    update(slug, () => sanitizeListData(data), profileId);
  },
  clear(slug: string, profileId?: string) {
    update(slug, (data) => ({ ...emptyListData(), lastVisitAt: data.lastVisitAt }), profileId);
  },
  setAnswer(slug: string, key: string, level: Level | null) {
    update(slug, (data) => ({ ...data, answers: setKey(data.answers, key, level) }));
  },
  setExperience(slug: string, key: string, experience: Experience | null) {
    update(slug, (data) => ({ ...data, experience: setKey(data.experience, key, experience) }));
  },
  setNote(slug: string, key: string, note: string) {
    update(slug, (data) => ({ ...data, notes: setKey(data.notes, key, note.trim() ? note : null) }));
  },
  saveCustom(slug: string, item: Omit<CustomItem, "id"> & { id?: number }) {
    update(slug, (data) => {
      const id = item.id ?? nextCustomId(data.custom);
      const saved: CustomItem = { ...item, id };
      const exists = data.custom.some((c) => c.id === id);
      return { ...data, custom: exists ? data.custom.map((c) => (c.id === id ? saved : c)) : [...data.custom, saved] };
    });
  },
  removeCustom(slug: string, id: number) {
    update(slug, (data) => {
      const prefix = `c${id}`;
      const keep = <T,>(map: Record<string, T>) =>
        Object.fromEntries(Object.entries(map).filter(([key]) => key !== prefix && !key.startsWith(`${prefix}.`)));
      return {
        ...data,
        custom: data.custom.filter((c) => c.id !== id),
        answers: keep(data.answers),
        experience: keep(data.experience),
        notes: keep(data.notes),
      };
    });
  },
  /** Records a visit and returns the time of the previous one. */
  markVisited(slug: string): number | undefined {
    const profileId = getProfiles().active;
    const key = dataKey(profileId, slug);
    const data = getData(profileId, slug);
    // Not a content change, so it doesn't bump updatedAt or trigger sync.
    const next = { ...data, lastVisitAt: Date.now() };
    cache.set(key, next);
    writeJson(key, next);
    notify(false);
    return data.lastVisitAt;
  },
};

/** Called after every local change (not changes from other tabs). Used by sync. */
export function onLocalChange(listener: () => void) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Whole-store snapshot, for encrypted sync                            */
/* ------------------------------------------------------------------ */

export interface StoreSnapshot {
  profiles: ProfilesState;
  data: Record<string, Record<string, ListData>>;
}

export function snapshotStore(): StoreSnapshot {
  const data: StoreSnapshot["data"] = {};
  for (const key of dataKeys()) {
    const [profileId, slug] = key.slice(DATA_PREFIX.length).split(":");
    if (profileId && slug) (data[profileId] ??= {})[slug] = getData(profileId, slug);
  }
  return { profiles: getProfiles(), data };
}

/** Merges a snapshot into local storage, keeping the newer copy of each profile and list. */
export function mergeSnapshot(remote: StoreSnapshot) {
  const local = getProfiles();
  const remoteProfiles = sanitizeProfiles(remote.profiles);
  if (remoteProfiles) {
    const deleted = { ...remoteProfiles.deleted, ...local.deleted };
    for (const [id, at] of Object.entries(remoteProfiles.deleted)) deleted[id] = Math.max(at, local.deleted[id] ?? 0);
    const byId = new Map<string, Profile>();
    for (const p of [...remoteProfiles.profiles, ...local.profiles]) {
      const current = byId.get(p.id);
      if (!current || p.updatedAt > current.updatedAt) byId.set(p.id, p);
    }
    const profiles = [...byId.values()].filter((p) => !(deleted[p.id] && deleted[p.id] >= p.updatedAt));
    if (profiles.length === 0) profiles.push(defaultProfile(Date.now()));
    const active = profiles.some((p) => p.id === local.active) ? local.active : profiles[0].id;
    const keys = dataKeys();
    for (const id of Object.keys(deleted)) {
      if (profiles.some((p) => p.id === id)) continue;
      for (const key of profileDataKeys(id, keys)) writeJson(key, null);
    }
    cache.clear();
    setProfiles({ active, profiles, deleted, updatedAt: Math.max(local.updatedAt, remoteProfiles.updatedAt) }, false);
  }
  const profileIds = new Set(getProfiles().profiles.map((p) => p.id));
  for (const [profileId, lists] of Object.entries(remote.data ?? {})) {
    if (!profileIds.has(profileId)) continue;
    for (const [slug, raw] of Object.entries(lists)) {
      if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(slug)) continue;
      const incoming = sanitizeListData(raw);
      const current = getData(profileId, slug);
      if (incoming.updatedAt > current.updatedAt) {
        setData(profileId, slug, { ...incoming, lastVisitAt: current.lastVisitAt ?? incoming.lastVisitAt }, false);
      }
    }
  }
  notify(false);
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useProfiles() {
  return useSyncExternalStore(subscribe, getProfiles, () => SERVER_PROFILES);
}

export function useListData(slug: string, profileId?: string) {
  const profiles = useProfiles();
  const id = profileId ?? profiles.active;
  const data = useSyncExternalStore(
    subscribe,
    () => getData(id, slug),
    () => EMPTY_DATA,
  );
  const setAnswer = useCallback((key: string, level: Level | null) => listStore.setAnswer(slug, key, level), [slug]);
  const setExperience = useCallback(
    (key: string, value: Experience | null) => listStore.setExperience(slug, key, value),
    [slug],
  );
  return { data, profileId: id, setAnswer, setExperience };
}

const subscribeNothing = () => () => {};

/** True once the component has hydrated. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
