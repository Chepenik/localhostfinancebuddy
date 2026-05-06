// Local, AI-free observations. Pure functions over the user's entries that
// produce calm, educational notes ("you're spending Y in housing", "your
// emergency fund covers ~N months", etc.). Nothing here calls the network,
// recommends specific investments, or tells the user to buy or sell anything.
//
// Each observation has a stable id (for React keys), a tone, a short title,
// and a one-or-two-sentence body. The dashboard renders the first handful of
// them as a calm list under the hero.
//
// This module is deliberately self-contained — only type-only imports — so
// the Node-based validator can run it without ESM extension headaches. The
// small inline helpers mirror lib/finance.ts; if either changes, both should.

import type { Entry, Frequency } from "./types";

export type ObservationTone = "info" | "positive" | "warning";

export interface Observation {
  id: string;
  tone: ObservationTone;
  title: string;
  body: string;
}

// Liquid asset categories — the ones a user can reasonably tap in a pinch.
// Investments and Retirement are intentionally excluded from the emergency-
// fund estimate (they'd overstate liquidity).
const LIQUID_ASSET_CATEGORIES = new Set(["Cash", "Checking", "Savings Account"]);

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

function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Match the formatter in lib/finance.ts: cents only for small absolute
  // values, otherwise whole dollars.
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
  }).format(n);
}

function aggregateByCategory(
  rows: { category: string; value: number }[],
): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.value <= 0) continue;
    map.set(r.category, (map.get(r.category) ?? 0) + r.value);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

interface InternalSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  savingsRate: number | null;
  debtToAssetRatio: number | null;
  expenseRows: { category: string; value: number }[];
  assetRows: { category: string; value: number }[];
  liquid: number;
  oneTimeFlowCount: number;
}

function summarizeForObservations(entries: Entry[]): InternalSummary {
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquid = 0;
  let oneTimeFlowCount = 0;
  const expenseRows: { category: string; value: number }[] = [];
  const assetRows: { category: string; value: number }[] = [];
  for (const e of entries) {
    if (e.kind === "income") {
      monthlyIncome += toMonthly(e.amount, e.frequency);
      if (e.frequency === "one-time") oneTimeFlowCount += 1;
    } else if (e.kind === "expense") {
      const m = toMonthly(e.amount, e.frequency);
      monthlyExpenses += m;
      expenseRows.push({ category: e.category, value: m });
      if (e.frequency === "one-time") oneTimeFlowCount += 1;
    } else if (e.kind === "asset") {
      const v = Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0;
      totalAssets += v;
      assetRows.push({ category: e.category, value: v });
      if (LIQUID_ASSET_CATEGORIES.has(e.category)) liquid += v;
    } else {
      const v = Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0;
      totalLiabilities += v;
    }
  }
  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? monthlyCashFlow / monthlyIncome : null;
  const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : null;
  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyCashFlow,
    totalAssets,
    totalLiabilities,
    savingsRate,
    debtToAssetRatio,
    expenseRows,
    assetRows,
    liquid,
    oneTimeFlowCount,
  };
}

export function buildObservations(entries: Entry[]): Observation[] {
  const obs: Observation[] = [];
  if (entries.length === 0) return obs;

  const s = summarizeForObservations(entries);

  // ---- onboarding: too few entries to draw conclusions --------------------
  if (entries.length < 4) {
    obs.push({
      id: "few-entries",
      tone: "info",
      title: "Add a few more items for a fuller picture",
      body: `You have ${entries.length} ${entries.length === 1 ? "entry" : "entries"} so far. Even one item from each of the four buckets (income, expenses, assets, debts) makes the dashboard meaningfully more useful.`,
    });
  }

  // ---- monthly cash flow --------------------------------------------------
  if (s.monthlyIncome > 0 && s.monthlyExpenses > 0) {
    if (s.monthlyCashFlow > 0) {
      obs.push({
        id: "cash-flow-positive",
        tone: "positive",
        title: "You have a monthly surplus",
        body: `You earn ${formatCurrency(s.monthlyCashFlow)} more than you spend each month. Over a year, before taxes and surprises, that's about ${formatCurrency(s.monthlyCashFlow * 12)} you don't need for daily life.`,
      });
    } else if (s.monthlyCashFlow < 0) {
      obs.push({
        id: "cash-flow-negative",
        tone: "warning",
        title: "Spending exceeds income this month",
        body: `Expenses run about ${formatCurrency(Math.abs(s.monthlyCashFlow))} more than income each month. Small changes to one or two categories often flip this without much pain.`,
      });
    }
  }

  // ---- savings rate -------------------------------------------------------
  if (s.savingsRate !== null && s.monthlyIncome > 0) {
    const rate = s.savingsRate;
    const pct = Math.round(rate * 100);
    if (rate >= 0.2) {
      obs.push({
        id: "savings-rate-strong",
        tone: "positive",
        title: `Savings rate: ${pct}%`,
        body: `You keep about ${pct}% of your income each month. A common rule of thumb is 20%+ — you're at or above it.`,
      });
    } else if (rate >= 0.1) {
      obs.push({
        id: "savings-rate-ok",
        tone: "info",
        title: `Savings rate: ${pct}%`,
        body: `You keep about ${pct}% of your income each month. A common rule of thumb is 20%+; getting there usually comes from one or two big-ticket categories, not a thousand small cuts.`,
      });
    } else if (rate > 0) {
      obs.push({
        id: "savings-rate-low",
        tone: "info",
        title: `Savings rate: ${pct}%`,
        body: `You keep about ${pct}% of your income each month. The biggest movers in most budgets are housing, transport, and food — worth a look before the smaller line items.`,
      });
    }
  }

  // ---- emergency fund estimate -------------------------------------------
  if (s.monthlyExpenses > 0 && s.liquid > 0) {
    const months = s.liquid / s.monthlyExpenses;
    const monthsRounded = Math.round(months * 10) / 10;
    let tone: ObservationTone;
    let body: string;
    if (months >= 6) {
      tone = "positive";
      body = `Your liquid assets (Cash, Checking, Savings) could cover about ${monthsRounded} months of expenses. That comfortably exceeds the 3–6 month range many people aim for.`;
    } else if (months >= 3) {
      tone = "info";
      body = `Your liquid assets could cover about ${monthsRounded} months of expenses. That sits inside the 3–6 month range many people aim for.`;
    } else {
      tone = "warning";
      body = `Your liquid assets (Cash, Checking, Savings) could cover about ${monthsRounded} months of expenses. People often aim for 3–6 months as a buffer against a job loss or unexpected bill.`;
    }
    obs.push({ id: "emergency-fund", tone, title: "Emergency fund estimate", body });
  } else if (s.monthlyExpenses > 0 && s.liquid === 0 && s.totalAssets > 0) {
    obs.push({
      id: "emergency-fund-none",
      tone: "info",
      title: "No liquid buffer recorded",
      body: "We don't see any Cash, Checking, or Savings entries. If you have any, adding them gives a more honest picture — and you'll see how many months of expenses they'd cover.",
    });
  }

  // ---- debt-to-asset reading ---------------------------------------------
  if (s.debtToAssetRatio !== null) {
    const r = s.debtToAssetRatio;
    const pct = Math.round(r * 100);
    if (r > 0.7) {
      obs.push({
        id: "debt-high",
        tone: "warning",
        title: "Debt is heavy relative to assets",
        body: `You owe about ${pct}% of what you own. Paying down the highest-interest balance first usually moves this number the most.`,
      });
    } else if (r < 0.3) {
      obs.push({
        id: "debt-low",
        tone: "positive",
        title: "Debt load looks healthy",
        body: `You owe about ${pct}% of what you own. That's well under the 30% mark people often use as a comfort threshold.`,
      });
    }
  } else if (s.totalLiabilities > 0 && s.totalAssets === 0) {
    obs.push({
      id: "debt-no-assets",
      tone: "info",
      title: "Add your assets to balance the picture",
      body: "You've recorded debts but no assets, so the dashboard only sees one side of the ledger. Even a single checking-account balance changes the read meaningfully.",
    });
  }

  // ---- top expense concentration -----------------------------------------
  const expenseCats = aggregateByCategory(s.expenseRows);
  const totalExpense = expenseCats.reduce((acc, c) => acc + c.total, 0);
  if (expenseCats.length > 1 && totalExpense > 0) {
    const top = expenseCats[0];
    const share = top.total / totalExpense;
    if (share > 0.35) {
      obs.push({
        id: "expense-concentration",
        tone: "info",
        title: `${top.category} is your biggest expense`,
        body: `${top.category} accounts for about ${Math.round(share * 100)}% of monthly spending (${formatCurrency(top.total)}/mo). It's the single biggest lever in your budget — small changes here move the needle.`,
      });
    }
  }

  // ---- asset concentration -----------------------------------------------
  const assetCats = aggregateByCategory(s.assetRows);
  const totalAsset = assetCats.reduce((acc, c) => acc + c.total, 0);
  if (assetCats.length > 1 && totalAsset > 0) {
    const top = assetCats[0];
    const share = top.total / totalAsset;
    if (share > 0.7) {
      obs.push({
        id: "asset-concentration",
        tone: "info",
        title: `Most of your assets sit in ${top.category}`,
        body: `${Math.round(share * 100)}% of what you own is in a single category. It's worth understanding the risk profile of that one bucket — concentration cuts both ways.`,
      });
    }
  }

  // ---- one-time entries reminder -----------------------------------------
  if (s.oneTimeFlowCount > 0) {
    obs.push({
      id: "one-time-note",
      tone: "info",
      title: `${s.oneTimeFlowCount} one-time ${s.oneTimeFlowCount === 1 ? "entry" : "entries"} excluded from monthly totals`,
      body: "One-time amounts don't recur, so they aren't part of your monthly run-rate. They're still listed in the Entries tab for reference.",
    });
  }

  return obs;
}
