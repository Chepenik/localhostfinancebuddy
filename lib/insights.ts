// AI Insights — privacy-first, bring-your-own-key.
//
// This module is intentionally split into two halves:
//   1. buildAiInsightsPayload: pure function. Given entries + options, returns
//      the exact JSON object that will be sent. NEVER reads names, notes, or
//      any other free-text fields. Only aggregate numbers and the predefined
//      category labels.
//   2. requestInsights: the only function that touches the network. Takes the
//      payload from (1) and posts it to the user's chosen OpenAI-compatible
//      endpoint. Errors are returned as values; the API key is never echoed
//      into thrown errors, logs, or returned strings.
//
// To keep this module trivially self-contained (and to make it easy to audit
// for accidental data leakage), the small aggregation logic it needs from
// lib/finance.ts is re-implemented locally in plain functions. There is no
// runtime dependency on any other lib/ module — only type-only imports.

import type { Entry, Frequency } from "./types";

export interface InsightsPayloadOptions {
  // When true, attaches category-level aggregates (category label + total).
  // Still excludes entry names and notes. Off by default.
  includeCategories?: boolean;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface ExpenseCategoryAmount {
  category: string;
  monthlyAmount: number;
}

export interface InsightsPayload {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  savingsRate: number | null;
  totalAssets: number;
  totalLiabilities: number;
  debtToAssetRatio: number | null;
  entryCount: number;
  generatedAt: string;
  // Optional aggregates — only present when includeCategories is true.
  expenseCategories?: ExpenseCategoryAmount[];
  assetCategories?: CategoryAmount[];
  liabilityCategories?: CategoryAmount[];
}

// Local, self-contained mirror of finance.toMonthly. Mirrored on purpose so
// this module has no runtime dependency on lib/finance.ts and the privacy
// surface stays trivially auditable.
function toMonthly(amount: number, frequency: Frequency): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  switch (frequency) {
    case "monthly":
      return amount;
    case "weekly":
      return (amount * 52) / 12;
    case "yearly":
      return amount / 12;
    case "one-time":
      return 0;
  }
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function round4(n: number | null): number | null {
  if (n === null) return null;
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10000) / 10000;
}

function aggregateByCategory<T>(
  rows: { category: string; value: number }[],
  shape: (category: string, total: number) => T,
): T[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.value <= 0) continue;
    map.set(r.category, (map.get(r.category) ?? 0) + r.value);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => shape(category, total));
}

// Pure. Reads only numeric fields, frequency, and the predefined category
// label on each entry. NEVER touches entry.name, entry.notes, entry.id,
// createdAt, or updatedAt.
export function buildAiInsightsPayload(
  entries: Entry[],
  options: InsightsPayloadOptions = {},
): InsightsPayload {
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  const expenseRows: { category: string; value: number }[] = [];
  const assetRows: { category: string; value: number }[] = [];
  const liabilityRows: { category: string; value: number }[] = [];
  const incomeRows: { category: string; value: number }[] = [];

  for (const e of entries) {
    if (e.kind === "income") {
      const monthly = toMonthly(e.amount, e.frequency);
      monthlyIncome += monthly;
      incomeRows.push({ category: e.category, value: monthly });
    } else if (e.kind === "expense") {
      const monthly = toMonthly(e.amount, e.frequency);
      monthlyExpenses += monthly;
      expenseRows.push({ category: e.category, value: monthly });
    } else if (e.kind === "asset") {
      const value = Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0;
      totalAssets += value;
      assetRows.push({ category: e.category, value });
    } else {
      const value = Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0;
      totalLiabilities += value;
      liabilityRows.push({ category: e.category, value });
    }
  }

  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const netWorth = totalAssets - totalLiabilities;
  const savingsRate = monthlyIncome > 0 ? monthlyCashFlow / monthlyIncome : null;
  const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : null;

  const payload: InsightsPayload = {
    netWorth: round2(netWorth),
    monthlyIncome: round2(monthlyIncome),
    monthlyExpenses: round2(monthlyExpenses),
    monthlyCashFlow: round2(monthlyCashFlow),
    savingsRate: round4(savingsRate),
    totalAssets: round2(totalAssets),
    totalLiabilities: round2(totalLiabilities),
    debtToAssetRatio: round4(debtToAssetRatio),
    entryCount: entries.length,
    generatedAt: new Date().toISOString(),
  };

  if (options.includeCategories) {
    payload.expenseCategories = aggregateByCategory(expenseRows, (category, total) => ({
      category,
      monthlyAmount: round2(total),
    }));
    payload.assetCategories = aggregateByCategory(assetRows, (category, total) => ({
      category,
      amount: round2(total),
    }));
    payload.liabilityCategories = aggregateByCategory(
      liabilityRows,
      (category, total) => ({ category, amount: round2(total) }),
    );
  }

  return payload;
}

// ---- prompts ---------------------------------------------------------------

export const AI_SYSTEM_PROMPT = `You are a calm, careful, non-judgmental financial summary assistant for a private, local-first dashboard.

Strict rules — follow all of them:
- This is NOT financial, tax, legal, or investment advice. Say so plainly in your caveat.
- Do not recommend specific investments, securities, tokens, funds, ETFs, stocks, or financial products.
- Do not tell the user to buy or sell anything.
- Base every observation only on the supplied summary JSON. Do not invent numbers.
- Be clear and explicit when data is missing or insufficient (for example: no income, no assets, no liabilities, very few entries).
- Use calm, direct, non-judgmental language. No alarm. No moralizing. No emoji.

Cover, when supported by the data: monthly cash flow, savings rate, debt load, expense concentration, asset/liability balance, and simple practical next steps.

Format your reply exactly like this, in plain text (no markdown headings, no asterisks):

Observations
- 3 to 5 short bullet points based only on the supplied summary.

Next steps
1. A practical next step.
2. A practical next step.
3. A practical next step.

Questions to answer yourself
- A question for the user to think through.
- A question for the user to think through.

Caveat
A short note that this is based only on the supplied summary, that this is not financial advice, and that the user should verify any conclusions against their own records.`;

export function buildUserPrompt(payload: InsightsPayload): string {
  return `Below is a minimized aggregate summary of my finances. Follow your instructions exactly.

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``;
}

// ---- request ---------------------------------------------------------------

export interface RequestInsightsArgs {
  apiKey: string;
  baseUrl: string;
  model: string;
  payload: InsightsPayload;
  signal?: AbortSignal;
}

export type RequestInsightsResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

function normalizeBaseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Reject anything that isn't an http(s) URL. Avoids file://, javascript:, etc.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  // Drop any trailing slashes from the path so we can join with /chat/completions.
  return trimmed.replace(/\/+$/, "");
}

export async function requestInsights(
  args: RequestInsightsArgs,
): Promise<RequestInsightsResult> {
  const { apiKey, baseUrl, model, payload, signal } = args;

  if (!apiKey) return { ok: false, error: "Missing API key." };
  if (!model.trim()) return { ok: false, error: "Missing model name." };
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return { ok: false, error: "Base URL must be a valid http(s) URL." };
  }

  const endpoint = `${normalized}/chat/completions`;

  const body = JSON.stringify({
    model: model.trim(),
    temperature: 0.2,
    messages: [
      { role: "system", content: AI_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(payload) },
    ],
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, error: "Request was cancelled." };
    }
    // Generic message — never echo URL detail or any header that could include
    // the API key.
    return {
      ok: false,
      error: "Couldn't reach the AI provider. Check your network and base URL.",
    };
  }

  if (!response.ok) {
    const providerMessage = await readProviderErrorMessage(response, apiKey);
    const suffix = providerMessage ? ` Provider said: "${providerMessage}".` : "";
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: `The provider rejected the API key. Double-check it.${suffix}`,
      };
    }
    if (response.status === 404) {
      return {
        ok: false,
        error: `Provider endpoint not found. Check the base URL and the model name.${suffix}`,
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        error: `Provider rate-limited or refused the request (often: out of credits, free-tier cap, or model not on your plan).${suffix}`,
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        error: `Provider returned a ${response.status} error. Try again later.${suffix}`,
      };
    }
    return {
      ok: false,
      error: `Provider returned ${response.status}.${suffix}`,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, error: "Provider returned an unreadable response." };
  }

  const text = extractText(json);
  if (!text) {
    return { ok: false, error: "Provider returned an empty response." };
  }
  return { ok: true, text };
}

// Reads the provider's error response and returns a short, sanitized message
// safe to show to the user. Never echoes the API key (defensive), strips
// anything that looks like a Bearer token, and caps length.
async function readProviderErrorMessage(
  response: Response,
  apiKey: string,
): Promise<string | null> {
  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return null;
  }
  if (!raw) return null;
  let message: string | null = null;
  try {
    const json = JSON.parse(raw) as unknown;
    if (json && typeof json === "object") {
      const err = (json as { error?: unknown }).error;
      if (typeof err === "string") message = err;
      else if (err && typeof err === "object") {
        const m = (err as { message?: unknown }).message;
        if (typeof m === "string") message = m;
      }
      if (!message) {
        const m = (json as { message?: unknown }).message;
        if (typeof m === "string") message = m;
      }
    }
  } catch {
    message = raw;
  }
  if (!message) return null;
  // Defensive scrubbing — should never be necessary, but cheap to do.
  if (apiKey) message = message.split(apiKey).join("[redacted]");
  message = message.replace(/Bearer\s+[A-Za-z0-9._\-:+=/]+/g, "Bearer [redacted]");
  message = message.replace(/sk-[A-Za-z0-9_\-]+/g, "[redacted]");
  message = message.trim().replace(/\s+/g, " ");
  if (message.length > 200) message = message.slice(0, 200) + "…";
  return message || null;
}

function extractText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as { choices?: unknown };
  if (!Array.isArray(obj.choices) || obj.choices.length === 0) return null;
  const first = obj.choices[0];
  if (!first || typeof first !== "object") return null;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  return trimmed || null;
}
