"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  buildAiInsightsPayload,
  requestInsights,
  type InsightsPayload,
} from "@/lib/insights";
import {
  clearApiKey,
  DEFAULT_AI_CONFIG,
  readApiKey,
  readConfig,
  readRemember,
  writeApiKey,
  writeConfig,
  type AiConfig,
} from "@/lib/aiSettings";
import { useEntries, useHydrated } from "@/lib/useEntries";

export default function InsightsPage() {
  const hydrated = useHydrated();

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">AI Insights</h1>
        <p className="mt-1 text-sm muted">
          Optional. Off by default. Bring your own key.
        </p>
      </header>

      <PrivacyNotice />

      {hydrated ? <InsightsClient /> : <Skeleton />}
    </div>
  );
}

function PrivacyNotice() {
  return (
    <section
      className="card p-6"
      style={{
        backgroundColor: "var(--color-accent-soft)",
        borderColor: "color-mix(in srgb, var(--color-accent) 30%, var(--color-border))",
      }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
        How this works
      </h2>
      <p className="mt-2 text-sm">
        AI insights are <strong>optional</strong>. To generate them, this app sends a
        small summary of your numbers to the AI provider you choose, using your own API
        key. Your raw entries, notes, and account names are <strong>not</strong> included
        by default.
      </p>
      <p className="mt-2 text-sm">
        For maximum privacy, consider a privacy-focused AI provider, or a local
        OpenAI-compatible endpoint (Ollama, LM Studio, llama.cpp, etc.) running on your
        own machine. Review the payload below before sending.
      </p>
      <p className="mt-2 text-sm">
        This app has no server. Your key, your config, and the response live only in
        this browser.
      </p>
    </section>
  );
}

function Skeleton() {
  return (
    <section className="card p-6">
      <div className="muted text-sm">Loading…</div>
    </section>
  );
}

function InsightsClient() {
  const { entries } = useEntries();

  // Lazy-init from storage. The parent gates this component behind hydration,
  // so window is defined and there's no SSR mismatch.
  const [apiKey, setApiKeyState] = useState<string>(() => readApiKey());
  const [remember, setRememberState] = useState<boolean>(() => readRemember());
  const [config, setConfigState] = useState<AiConfig>(() => readConfig());
  const [includeCategories, setIncludeCategoriesState] = useState<boolean>(
    () => readConfig().includeCategories,
  );

  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateApiKey = (next: string) => {
    setApiKeyState(next);
    writeApiKey(next, remember);
  };

  const updateRemember = (next: boolean) => {
    setRememberState(next);
    // Re-mirror the current key under the new persistence policy.
    writeApiKey(apiKey, next);
  };

  const updateConfig = (next: AiConfig) => {
    setConfigState(next);
    writeConfig(next);
  };

  const updateIncludeCategories = (next: boolean) => {
    setIncludeCategoriesState(next);
    const merged = { ...config, includeCategories: next };
    setConfigState(merged);
    writeConfig(merged);
  };

  const payload: InsightsPayload = useMemo(
    () => buildAiInsightsPayload(entries, { includeCategories }),
    [entries, includeCategories],
  );

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const empty = entries.length === 0;
  const canGenerate =
    !empty && !!apiKey.trim() && !!config.baseUrl.trim() && !!config.model.trim();

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;
    setError(null);
    setInsights(null);
    setGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await requestInsights({
      apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      payload,
      signal: controller.signal,
    });
    abortRef.current = null;
    setGenerating(false);
    if (result.ok) {
      setInsights(result.text);
    } else {
      setError(result.error);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleCopy = async () => {
    if (!insights) return;
    try {
      await navigator.clipboard.writeText(insights);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard might be blocked. Silent — the user can select-and-copy.
    }
  };

  const handleClearKey = () => {
    setApiKeyState("");
    setRememberState(false);
    clearApiKey();
  };

  if (empty) {
    return <EmptyState />;
  }

  return (
    <>
      <section className="card p-6">
        <h2 className="text-sm font-semibold">Provider</h2>
        <p className="mt-1 text-sm muted">
          Defaults to <strong>OpenRouter</strong> with <code>moonshotai/kimi-k2</code>.
          Any OpenAI-compatible <code>/chat/completions</code> endpoint works —
          OpenRouter, OpenAI, Groq, or a local model (Ollama, LM Studio).
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="label" htmlFor="ai-key">
              API key
            </label>
            <input
              id="ai-key"
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => updateApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => updateRemember(e.target.checked)}
                />
                <span>Remember this key on this device</span>
              </label>
              {apiKey && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleClearKey}
                  style={{ padding: "0.25rem 0.5rem" }}
                >
                  Forget key
                </button>
              )}
            </div>
            <p className="mt-2 text-xs muted">
              Session-only by default — the key is held in this tab&apos;s
              <code> sessionStorage</code> and gone when you close it. If you tick
              &ldquo;Remember,&rdquo; it&apos;s stored in this browser&apos;s
              <code> localStorage</code>.{" "}
              <strong>Browser storage is not a secure vault</strong>: anyone with
              access to this device or browser profile can read it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ai-base-url">
                Base URL
              </label>
              <input
                id="ai-base-url"
                type="text"
                className="input"
                value={config.baseUrl}
                onChange={(e) =>
                  updateConfig({ ...config, baseUrl: e.target.value })
                }
                placeholder={DEFAULT_AI_CONFIG.baseUrl}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <p className="mt-1 text-xs muted">
                Examples: <code>https://openrouter.ai/api/v1</code>,{" "}
                <code>https://api.openai.com/v1</code>,{" "}
                <code>http://localhost:11434/v1</code> (Ollama),{" "}
                <code>http://localhost:1234/v1</code> (LM Studio).
              </p>
            </div>
            <div>
              <label className="label" htmlFor="ai-model">
                Model
              </label>
              <input
                id="ai-model"
                type="text"
                className="input"
                value={config.model}
                onChange={(e) => updateConfig({ ...config, model: e.target.value })}
                placeholder={DEFAULT_AI_CONFIG.model}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <p className="mt-1 text-xs muted">
                Any model your provider supports. Default:{" "}
                <code>{DEFAULT_AI_CONFIG.model}</code>. To pin a specific Kimi
                version on OpenRouter, edit this (e.g.{" "}
                <code>moonshotai/kimi-k2-0905</code>).
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Payload preview</h2>
            <p className="mt-1 text-sm muted">
              This is the <strong>exact</strong> JSON that will be sent if you click
              Generate. Nothing else leaves your browser.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={includeCategories}
              onChange={(e) => updateIncludeCategories(e.target.checked)}
            />
            <span>Include category-level totals</span>
          </label>
        </div>

        <pre
          className="mt-4 max-h-80 overflow-auto rounded-xl border p-4 text-xs leading-relaxed tabular-nums"
          style={{
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {payloadJson}
        </pre>

        <p className="mt-3 text-xs muted">
          Excluded: entry names, notes, account/employer names, IDs, timestamps, and
          your raw <code>localStorage</code> blob.{" "}
          {!includeCategories &&
            "Category-level totals are off — only the top-line aggregates above will be sent."}
        </p>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Generate insights</h2>
            <p className="mt-1 text-sm muted">
              When you click Generate, the payload above is POSTed to{" "}
              <code>{normalizeForDisplay(config.baseUrl)}/chat/completions</code>. The
              response comes back here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!generating && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canGenerate}
                onClick={handleGenerate}
                title={
                  !apiKey
                    ? "Enter an API key first"
                    : !config.baseUrl || !config.model
                      ? "Set the base URL and model"
                      : undefined
                }
              >
                Generate insights
              </button>
            )}
            {generating && (
              <>
                <button type="button" className="btn" disabled>
                  Generating…
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div
            className="mt-4 rounded-lg px-3 py-2 text-sm"
            style={{
              color: "var(--color-negative)",
              backgroundColor:
                "color-mix(in srgb, var(--color-negative) 10%, transparent)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {insights && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-medium uppercase tracking-wider muted">
                Result
              </div>
              <button type="button" className="btn btn-ghost" onClick={handleCopy}>
                {copied ? "Copied" : "Copy insights"}
              </button>
            </div>
            <div
              className="mt-2 whitespace-pre-wrap rounded-xl border p-4 text-sm leading-relaxed"
              style={{
                backgroundColor: "var(--color-bg)",
                borderColor: "var(--color-border)",
              }}
            >
              {insights}
            </div>
            <p className="mt-3 text-xs muted">
              Output is a model summary, not financial advice. The app does not save
              this result — it disappears on reload.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function EmptyState() {
  return (
    <section className="card p-8 text-center">
      <h2 className="text-base font-semibold">Add some entries first</h2>
      <p className="mx-auto mt-2 max-w-md text-sm muted">
        AI insights need a financial picture to summarize. Add a few items so there&apos;s
        something to send — nothing is generated until you click Generate.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/entries" className="btn btn-primary">
          Add entries
        </Link>
        <Link href="/settings" className="btn">
          Try with demo data
        </Link>
      </div>
    </section>
  );
}

function normalizeForDisplay(url: string): string {
  return url.replace(/\/+$/, "") || DEFAULT_AI_CONFIG.baseUrl;
}
