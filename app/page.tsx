"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AssetsLiabilitiesBar } from "@/components/AssetsLiabilitiesBar";
import { CategoryPie } from "@/components/charts/CategoryPie";
import { MetricTile } from "@/components/MetricTile";
import { NetWorthHero } from "@/components/NetWorthHero";
import {
  assetsByCategory,
  expensesByCategory,
  formatCurrency,
  formatPercent,
  formatSigned,
  summarize,
} from "@/lib/finance";
import { useEntries } from "@/lib/useEntries";

export default function DashboardPage() {
  const { entries, hydrated } = useEntries();
  const summary = useMemo(() => summarize(entries), [entries]);
  const expenseBreakdown = useMemo(() => expensesByCategory(entries), [entries]);
  const assetBreakdown = useMemo(() => assetsByCategory(entries), [entries]);

  // During SSR + first client paint, render the empty hero so the layout is
  // stable. Real numbers stream in once the localStorage snapshot is read.
  const empty = !hydrated || entries.length === 0;

  return (
    <div className="grid gap-8">
      <NetWorthHero summary={summary} empty={empty} />

      {!empty && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricTile
              label="Monthly cash flow"
              value={formatSigned(summary.monthlyCashFlow)}
              hint={
                summary.monthlyCashFlow >= 0
                  ? "What you keep each month"
                  : "Spending more than you earn"
              }
              tone={summary.monthlyCashFlow >= 0 ? "positive" : "negative"}
            />
            <MetricTile
              label="Savings rate"
              value={formatPercent(summary.savingsRate)}
              hint={
                summary.savingsRate === null
                  ? "Add income to calculate"
                  : "Share of income you keep"
              }
            />
            <MetricTile
              label="Debt-to-asset"
              value={formatPercent(summary.debtToAssetRatio)}
              hint={
                summary.debtToAssetRatio === null
                  ? "Add assets to calculate"
                  : "Lower is healthier"
              }
            />
          </section>

          <section className="card p-6">
            <AssetsLiabilitiesBar
              assets={summary.totalAssets}
              liabilities={summary.totalLiabilities}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartPanel
              title="Where your money goes"
              subtitle="Monthly spending by category"
              empty={expenseBreakdown.length === 0}
              emptyText="Add some expenses to see this."
            >
              <CategoryPie data={expenseBreakdown} />
            </ChartPanel>

            <ChartPanel
              title="What you own"
              subtitle="Assets by category"
              empty={assetBreakdown.length === 0}
              emptyText="Add some assets to see this."
            >
              <CategoryPie data={assetBreakdown} />
            </ChartPanel>
          </section>

          <section className="card flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Income &amp; expenses this month</h3>
              <p className="mt-0.5 text-xs muted">
                {formatCurrency(summary.monthlyIncome)} in,{" "}
                {formatCurrency(summary.monthlyExpenses)} out
              </p>
            </div>
            <Link href="/entries" className="btn">
              Manage entries
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle?: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs muted">{subtitle}</p>}
      </div>
      {empty ? (
        <div
          className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm muted"
          style={{ borderColor: "var(--color-border)" }}
        >
          {emptyText}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
