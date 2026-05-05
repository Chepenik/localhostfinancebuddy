import type {
  AssetEntry,
  Entry,
  ExpenseEntry,
  Frequency,
  IncomeEntry,
  LiabilityEntry,
} from "./types";

// Convert an amount with any frequency to its monthly equivalent.
// "one-time" is intentionally 0 — it doesn't recur, so it doesn't
// belong in a monthly run-rate. Users see one-time entries in the list,
// but they don't inflate the dashboard's monthly cash-flow numbers.
export function toMonthly(amount: number, frequency: Frequency): number {
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

export const isIncome = (e: Entry): e is IncomeEntry => e.kind === "income";
export const isExpense = (e: Entry): e is ExpenseEntry => e.kind === "expense";
export const isAsset = (e: Entry): e is AssetEntry => e.kind === "asset";
export const isLiability = (e: Entry): e is LiabilityEntry => e.kind === "liability";

export type HealthRating = "great" | "good" | "okay" | "tight" | "n/a";

export interface Summary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  // Ratios are null when undefined (no denominator).
  debtToAssetRatio: number | null;
  savingsRate: number | null;
  health: HealthRating;
  // Projected net worth in 12 months at current monthly cash-flow rate.
  // null if there's no income or expense data to project from.
  projectedNetWorth12m: number | null;
  hasAny: boolean;
}

export function summarize(entries: Entry[]): Summary {
  const monthlyIncome = entries
    .filter(isIncome)
    .reduce((acc, e) => acc + toMonthly(e.amount, e.frequency), 0);

  const monthlyExpenses = entries
    .filter(isExpense)
    .reduce((acc, e) => acc + toMonthly(e.amount, e.frequency), 0);

  const totalAssets = entries.filter(isAsset).reduce((acc, e) => acc + e.amount, 0);
  const totalLiabilities = entries.filter(isLiability).reduce((acc, e) => acc + e.amount, 0);

  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const netWorth = totalAssets - totalLiabilities;

  const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : null;
  const savingsRate = monthlyIncome > 0 ? monthlyCashFlow / monthlyIncome : null;

  const hasFlowData = monthlyIncome > 0 || monthlyExpenses > 0;
  const projectedNetWorth12m = hasFlowData ? netWorth + monthlyCashFlow * 12 : null;

  const hasAny = entries.length > 0;

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyCashFlow,
    totalAssets,
    totalLiabilities,
    netWorth,
    debtToAssetRatio,
    savingsRate,
    projectedNetWorth12m,
    health: rateHealth({ savingsRate, debtToAssetRatio, netWorth, hasAny }),
    hasAny,
  };
}

function rateHealth(args: {
  savingsRate: number | null;
  debtToAssetRatio: number | null;
  netWorth: number;
  hasAny: boolean;
}): HealthRating {
  const { savingsRate, debtToAssetRatio, netWorth, hasAny } = args;
  if (!hasAny) return "n/a";

  let score = 0;
  if (savingsRate !== null) {
    if (savingsRate >= 0.2) score += 2;
    else if (savingsRate >= 0.1) score += 1;
    else if (savingsRate < 0) score -= 2;
  }
  if (debtToAssetRatio !== null) {
    if (debtToAssetRatio < 0.3) score += 1;
    else if (debtToAssetRatio > 0.7) score -= 1;
  }
  if (netWorth > 0) score += 1;
  if (netWorth < 0) score -= 1;

  if (score >= 3) return "great";
  if (score >= 1) return "good";
  if (score >= 0) return "okay";
  return "tight";
}

export interface CategoryBreakdown {
  category: string;
  total: number;
}

function aggregateBy<T extends Entry>(
  entries: Entry[],
  guard: (e: Entry) => e is T,
  amountOf: (e: T) => number,
): CategoryBreakdown[] {
  const map = new Map<string, number>();
  for (const e of entries.filter(guard)) {
    const value = amountOf(e);
    if (value <= 0) continue;
    map.set(e.category, (map.get(e.category) ?? 0) + value);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export const expensesByCategory = (entries: Entry[]) =>
  aggregateBy(entries, isExpense, (e) => toMonthly(e.amount, e.frequency));

export const incomeByCategory = (entries: Entry[]) =>
  aggregateBy(entries, isIncome, (e) => toMonthly(e.amount, e.frequency));

export const assetsByCategory = (entries: Entry[]) =>
  aggregateBy(entries, isAsset, (e) => e.amount);

export const liabilitiesByCategory = (entries: Entry[]) =>
  aggregateBy(entries, isLiability, (e) => e.amount);

// ---- formatting ------------------------------------------------------------

export function formatCurrency(n: number, currency = "USD"): string {
  if (!Number.isFinite(n)) return "—";
  // Show cents only for small absolute values; keep big numbers clean.
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
  }).format(n);
}

// Compact form for hero numbers and tight tooltips ($1.2M, $480k).
export function formatCurrencyCompact(n: number, currency = "USD"): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 10_000) return formatCurrency(n, currency);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatPercent(n: number | null, digits = 0): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatSigned(n: number, currency = "USD"): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + formatCurrency(n, currency);
}
