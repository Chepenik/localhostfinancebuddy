"use client";

import { useSyncExternalStore } from "react";
import { loadState, STATE_EVENTS } from "./storage";
import { EMPTY_STATE, type Entry } from "./types";

// ---- entries store ---------------------------------------------------------

function subscribe(callback: () => void) {
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === null || ev.key.startsWith("lfb:")) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STATE_EVENTS.changed, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STATE_EVENTS.changed, callback);
  };
}

// Cache the last raw string + parsed entries so useSyncExternalStore can
// return a stable reference between calls.
let cachedRaw: string | null | undefined;
let cachedEntries: Entry[] = EMPTY_STATE.entries;

function getSnapshot(): Entry[] {
  const raw = window.localStorage.getItem(STATE_EVENTS.storageKey);
  if (raw === cachedRaw) return cachedEntries;
  cachedRaw = raw;
  cachedEntries = loadState().entries;
  return cachedEntries;
}

function getServerSnapshot(): Entry[] {
  return EMPTY_STATE.entries;
}

// ---- hydrated store --------------------------------------------------------
// Lets components render a stable shell during SSR + the first client paint,
// then swap to real data after hydration. Avoids a flash of empty state for
// users who already have data saved.

let hydrated = false;
const hydratedListeners = new Set<() => void>();

function subscribeHydrated(cb: () => void) {
  hydratedListeners.add(cb);
  if (!hydrated) {
    hydrated = true;
    queueMicrotask(() => {
      for (const listener of hydratedListeners) listener();
    });
  }
  return () => {
    hydratedListeners.delete(cb);
  };
}

const getHydrated = () => hydrated;
const getServerHydrated = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydrated, getHydrated, getServerHydrated);
}

// ---- public hook -----------------------------------------------------------

export function useEntries(): { entries: Entry[]; hydrated: boolean } {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = useHydrated();
  return { entries, hydrated: isHydrated };
}
