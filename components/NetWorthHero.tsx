"use client";

import Link from "next/link";
import type { Summary } from "@/lib/finance";
import { formatCurrency, formatSigned } from "@/lib/finance";

const HEALTH_LABEL: Record<Summary["health"], string> = {
  great: "Looking great",
  good: "On track",
  okay: "Getting started",
  tight: "A bit tight",
  "n/a": "Add a few items to begin",
};

const HEALTH_BLURB: Record<Summary["health"], string> = {
  great: "You're saving well and your debts are under control.",
  good: "You're earning more than you spend and building toward your goals.",
  okay: "You're up and running. Add a couple more items for a clearer picture.",
  tight: "Spending is close to or above income. Small cuts can free real room.",
  "n/a": "Add some income, expenses, assets, and debts to see your picture.",
};

interface Props {
  summary: Summary;
  empty: boolean;
}

export function NetWorthHero({ summary, empty }: Props) {
  const tone =
    empty || summary.netWorth === 0
      ? "neutral"
      : summary.netWorth > 0
        ? "positive"
        : "negative";

  const accent =
    tone === "positive"
      ? "var(--color-positive)"
      : tone === "negative"
        ? "var(--color-negative)"
        : "var(--color-fg)";

  const projectionText =
    summary.projectedNetWorth12m !== null && !empty
      ? `≈ ${formatCurrency(summary.projectedNetWorth12m)} in 12 months at this pace`
      : null;

  const cashFlowText =
    summary.monthlyCashFlow !== 0 || summary.monthlyIncome > 0 || summary.monthlyExpenses > 0
      ? `${formatSigned(summary.monthlyCashFlow)} per month`
      : null;

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-soft) 60%, var(--color-surface)) 0%, var(--color-surface) 100%)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <div className="text-xs font-medium uppercase tracking-[0.14em] muted">
          Net worth
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1
            className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl md:text-7xl"
            style={{ color: accent, fontVariantNumeric: "tabular-nums" }}
          >
            {empty ? "$0" : formatCurrency(summary.netWorth)}
          </h1>
          {cashFlowText && (
            <span
              className="text-sm font-medium tabular-nums"
              style={{
                color:
                  summary.monthlyCashFlow >= 0
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
              }}
            >
              {cashFlowText}
            </span>
          )}
        </div>

        <p className="mt-3 max-w-xl text-sm muted">
          {empty ? HEALTH_BLURB["n/a"] : HEALTH_BLURB[summary.health]}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-fg) 6%, transparent)",
              color: "var(--color-fg)",
            }}
          >
            {empty ? HEALTH_LABEL["n/a"] : HEALTH_LABEL[summary.health]}
          </span>
          {projectionText && <span className="text-xs muted">{projectionText}</span>}
        </div>

        {empty && (
          <div className="mt-7 flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/entries">
              Add your first entry
            </Link>
            <Link className="btn" href="/settings">
              Try with demo data
            </Link>
          </div>
        )}

        {!empty && (
          <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 sm:max-w-md">
            <Stat label="Total assets" value={formatCurrency(summary.totalAssets)} />
            <Stat
              label="Total liabilities"
              value={formatCurrency(summary.totalLiabilities)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
