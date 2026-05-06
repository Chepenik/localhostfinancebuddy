"use client";

import { coerceEntry, EMPTY_STATE, type AppState, type Entry } from "./types";

const STORAGE_KEY = "lfb:state:v1";
const STATE_CHANGED_EVENT = "lfb:state-changed";

function hasStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__lfb_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

let storageAvailable: boolean | null = null;
export function isLocalStorageAvailable(): boolean {
  if (storageAvailable === null) storageAvailable = hasStorage();
  return storageAvailable;
}

function safeParse(raw: string | null): AppState {
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;
    const obj = parsed as { entries?: unknown };
    if (!Array.isArray(obj.entries)) return EMPTY_STATE;
    const entries = obj.entries
      .map((e) => coerceEntry(e))
      .filter((e): e is Entry => e !== null);
    return { version: 1, entries };
  } catch {
    return EMPTY_STATE;
  }
}

export function loadState(): AppState {
  if (!isLocalStorageAvailable()) return EMPTY_STATE;
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(state: AppState): { ok: true } | { ok: false; error: string } {
  if (!isLocalStorageAvailable()) {
    return { ok: false, error: "Local storage isn't available in this browser." };
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(STATE_CHANGED_EVENT));
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Out of browser storage. Export a backup and clear some entries."
        : e instanceof Error
          ? e.message
          : "Couldn't save your data.";
    return { ok: false, error: message };
  }
}

export function clearState(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(STATE_CHANGED_EVENT));
  } catch {
    // Best-effort: ignore.
  }
}

export function addEntry(entry: Entry): void {
  const state = loadState();
  state.entries.push(entry);
  saveState(state);
}

export function updateEntry(updated: Entry): void {
  const state = loadState();
  const idx = state.entries.findIndex((e) => e.id === updated.id);
  if (idx === -1) return;
  state.entries[idx] = { ...updated, updatedAt: Date.now() };
  saveState(state);
}

export function deleteEntry(id: string): void {
  const state = loadState();
  state.entries = state.entries.filter((e) => e.id !== id);
  saveState(state);
}

export function exportJson(): string {
  return JSON.stringify(loadState(), null, 2);
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  imported: number;
  skipped: number;
  versionMismatch?: boolean;
}

// Hard cap on the JSON blob we're willing to parse. The app stores hundreds
// of items at most; anything past 4 MB is almost certainly the wrong file
// (or a malformed export) and could freeze the tab during JSON.parse.
const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
// Hard cap on the number of entries we'll accept in one import.
const MAX_IMPORT_ENTRIES = 50_000;

export function importJson(raw: string): ImportResult {
  if (raw.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: "That file is unusually large for a Finance Buddy backup. Pick the right export and try again.",
      imported: 0,
      skipped: 0,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That doesn't look like JSON.", imported: 0, skipped: 0 };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "That file isn't a Finance Buddy backup.", imported: 0, skipped: 0 };
  }
  const obj = parsed as { entries?: unknown; version?: unknown };
  if (!Array.isArray(obj.entries)) {
    return {
      ok: false,
      error: "We couldn't find any entries in that file.",
      imported: 0,
      skipped: 0,
    };
  }
  if (obj.entries.length > MAX_IMPORT_ENTRIES) {
    return {
      ok: false,
      error: `That file has ${obj.entries.length.toLocaleString()} entries, which is more than this app is built to handle.`,
      imported: 0,
      skipped: 0,
    };
  }
  // Soft schema check. Older or future files may not have version === 1; we
  // still try to import them (coerceEntry is the real gate), but we return a
  // signal so the UI can show a friendly note.
  const versionMismatch =
    obj.version !== undefined && obj.version !== 1;

  let skipped = 0;
  const entries: Entry[] = [];
  for (const candidate of obj.entries) {
    const e = coerceEntry(candidate);
    if (e) entries.push(e);
    else skipped += 1;
  }

  const result = saveState({ version: 1, entries });
  if (!result.ok) {
    return { ok: false, error: result.error, imported: 0, skipped };
  }
  return {
    ok: true,
    imported: entries.length,
    skipped,
    versionMismatch,
  };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const STATE_EVENTS = {
  changed: STATE_CHANGED_EVENT,
  storageKey: STORAGE_KEY,
};
