"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AssetsLiabilitiesBar } from "@/components/AssetsLiabilitiesBar";
import { CategoryPie } from "@/components/charts/CategoryPie";
import { MetricTile } from "@/components/MetricTile";
import { NetWorthHero } from "@/components/NetWorthHero";
import { Observations } from "@/components/Observations";
import {
  assetsByCategory,
  expensesByCategory,
  formatCurrency,
  formatPercent,
  formatSigned,
  summarize,
} from "@/lib/finance";
import { buildObservations } from "@/lib/observations";
import { useEntries } from "@/lib/useEntries";

export default function DashboardPage() {
  const { entries, hydrated } = useEntries();
  const summary = useMemo(() => summarize(entries), [entries]);
  const expenseBreakdown = useMemo(() => expensesByCategory(entries), [entries]);
  const assetBreakdown = useMemo(() => assetsByCategory(entries), [entries]);
  const observations = useMemo(() => buildObservations(entries), [entries]);

  // During SSR + first client paint, render the empty hero so the layout is
  // stable. Real numbers stream in once the localStorage snapshot is read.
  const empty = !hydrated || entries.length === 0;

  return (
    <div className="grid gap-8">
      <NetWorthHero summary={summary} empty={empty} />

      {empty && <FirstRunGuide />}

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
              definition="Income minus expenses, normalized to a monthly figure. Weekly amounts are × 52 ÷ 12 and yearly amounts are ÷ 12. One-time entries don't count toward your monthly run-rate."
            />
            <MetricTile
              label="Savings rate"
              value={formatPercent(summary.savingsRate)}
              hint={
                summary.savingsRate === null
                  ? "Add income to calculate"
                  : "Share of income you keep"
              }
              definition="The portion of monthly income that doesn't get spent. A common rule of thumb is 20%+, but the right number depends on your goals, age, and where you live. Negative means you're spending more than you earn."
            />
            <MetricTile
              label="Debt-to-asset"
              value={formatPercent(summary.debtToAssetRatio)}
              hint={
                summary.debtToAssetRatio === null
                  ? "Add assets to calculate"
                  : "Lower is healthier"
              }
              definition="Total liabilities divided by total assets. Below 30% is generally comfortable; above 70% means most of what you own is owed. Mortgages move this number a lot — that doesn't always mean trouble, but it's worth knowing."
            />
          </section>

          <section className="card p-6">
            <AssetsLiabilitiesBar
              assets={summary.totalAssets}
              liabilities={summary.totalLiabilities}
            />
          </section>

          <Observations observations={observations} />

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

function FirstRunGuide() {
  return (
    <section
      className="card p-6"
      aria-labelledby="first-run-heading"
    >
      <h2 id="first-run-heading" className="text-sm font-semibold">
        How this works
      </h2>
      <p className="mt-1 text-sm muted">
        Track four kinds of items. The dashboard does the math.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        <GuideItem
          title="Income"
          body="What comes in. Salary, freelance, dividends — pick a frequency and we'll convert it to a monthly figure."
        />
        <GuideItem
          title="Expenses"
          body="What goes out. Rent, groceries, subscriptions, debt payments. Mark recurring bills if you like."
        />
        <GuideItem
          title="Assets"
          body="What you own today. Cash, accounts, investments, vehicles, property. Point-in-time balances."
        />
        <GuideItem
          title="Liabilities"
          body="What you owe today. Loans, credit-card balances, mortgages. Point-in-time balances."
        />
      </ul>
      <p className="mt-5 text-xs muted">
        Everything stays in this browser&apos;s storage. No server, no account, nothing
        sent anywhere — you can verify in your browser&apos;s network tab.
      </p>
    </section>
  );
}

function GuideItem({ title, body }: { title: string; body: string }) {
  return (
    <li
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs muted leading-relaxed">{body}</p>
    </li>
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
