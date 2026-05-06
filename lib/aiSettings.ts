"use client";

// Storage helpers for the AI Insights feature.
//
// Privacy posture:
// - The API key is session-only by default (sessionStorage, cleared when the
//   tab closes). It is never written to the main app state blob and never
//   round-tripped through export/import.
// - The user can opt in to "remember on this device", which mirrors the key
//   to localStorage. This is clearly labelled as not a secure vault.
// - Non-secret config (base URL, model, includeCategories) lives in
//   localStorage so it persists conveniently. Nothing here is sensitive.

const KEY_LOCAL = "lfb:ai-key:v1";
const KEY_SESSION = "lfb:ai-key:session:v1";
const CONFIG_LOCAL = "lfb:ai-config:v1";

export interface AiConfig {
  baseUrl: string;
  model: string;
  includeCategories: boolean;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k2",
  includeCategories: false,
};

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function readApiKey(): string {
  const w = safeWindow();
  if (!w) return "";
  try {
    return w.localStorage.getItem(KEY_LOCAL) ?? w.sessionStorage.getItem(KEY_SESSION) ?? "";
  } catch {
    return "";
  }
}

// "Remember" is true if the key is present in localStorage (the persistent
// store). sessionStorage-only means remember = false.
export function readRemember(): boolean {
  const w = safeWindow();
  if (!w) return false;
  try {
    return w.localStorage.getItem(KEY_LOCAL) !== null;
  } catch {
    return false;
  }
}

export function writeApiKey(key: string, remember: boolean): void {
  const w = safeWindow();
  if (!w) return;
  try {
    if (!key) {
      w.localStorage.removeItem(KEY_LOCAL);
      w.sessionStorage.removeItem(KEY_SESSION);
      return;
    }
    if (remember) {
      w.localStorage.setItem(KEY_LOCAL, key);
      w.sessionStorage.removeItem(KEY_SESSION);
    } else {
      w.sessionStorage.setItem(KEY_SESSION, key);
      w.localStorage.removeItem(KEY_LOCAL);
    }
  } catch {
    // Storage disabled or quota exceeded — silently ignore. The user will
    // simply have to re-enter the key next time.
  }
}

export function clearApiKey(): void {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.removeItem(KEY_LOCAL);
    w.sessionStorage.removeItem(KEY_SESSION);
  } catch {
    // Best-effort.
  }
}

export function readConfig(): AiConfig {
  const w = safeWindow();
  if (!w) return DEFAULT_AI_CONFIG;
  try {
    const raw = w.localStorage.getItem(CONFIG_LOCAL);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AiConfig> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_AI_CONFIG;
    return {
      baseUrl:
        typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()
          ? parsed.baseUrl
          : DEFAULT_AI_CONFIG.baseUrl,
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model
          : DEFAULT_AI_CONFIG.model,
      includeCategories:
        typeof parsed.includeCategories === "boolean"
          ? parsed.includeCategories
          : DEFAULT_AI_CONFIG.includeCategories,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function writeConfig(config: AiConfig): void {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(CONFIG_LOCAL, JSON.stringify(config));
  } catch {
    // Best-effort.
  }
}
