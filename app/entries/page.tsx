"use client";

import { useMemo, useState } from "react";
import { EntryForm } from "@/components/EntryForm";
import { EntryList } from "@/components/EntryList";
import { useEntries } from "@/lib/useEntries";
import type { EntryKind } from "@/lib/types";
import { formatCurrency, summarize, toMonthly } from "@/lib/finance";

const TABS: { id: EntryKind; label: string; help: string }[] = [
  {
    id: "income",
    label: "Income",
    help: "Money coming in — paychecks, side gigs, dividends, anything regular or one-off.",
  },
  {
    id: "expense",
    label: "Expenses",
    help: "Money going out — rent, food, bills, subscriptions, debt payments, fun money.",
  },
  {
    id: "asset",
    label: "Assets",
    help: "Things you own that have value — cash, accounts, investments, property, vehicles.",
  },
  {
    id: "liability",
    label: "Liabilities",
    help: "Money you owe — loans, credit card balances, mortgages.",
  },
];

export default function EntriesPage() {
  const [tab, setTab] = useState<EntryKind>("income");
  const { entries, hydrated } = useEntries();
  const summary = useMemo(() => summarize(entries), [entries]);

  const filtered = useMemo(
    () =>
      entries
        .filter((e) => e.kind === tab)
        .sort((a, b) => {
          const av =
            a.kind === "income" || a.kind === "expense"
              ? toMonthly(a.amount, a.frequency)
              : a.amount;
          const bv =
            b.kind === "income" || b.kind === "expense"
              ? toMonthly(b.amount, b.frequency)
              : b.amount;
          return bv - av;
        }),
    [entries, tab],
  );

  const tabTotals: Record<EntryKind, string> = {
    income: formatCurrency(summary.monthlyIncome) + "/mo",
    expense: formatCurrency(summary.monthlyExpenses) + "/mo",
    asset: formatCurrency(summary.totalAssets),
    liability: formatCurrency(summary.totalLiabilities),
  };

  const active = TABS.find((t) => t.id === tab)!;
  const singular = active.label.toLowerCase().replace(/s$/, "");

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Your entries</h1>
        <p className="mt-1 text-sm muted">
          Add, edit, or delete the items that make up your picture.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const activeTab = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab ? "var(--color-accent)" : "var(--color-surface)",
                color: activeTab ? "white" : "var(--color-fg)",
                border: "1px solid",
                borderColor: activeTab ? "var(--color-accent)" : "var(--color-border)",
              }}
            >
              {t.label}
              <span className="ml-2 text-xs opacity-80 tabular-nums">
                {hydrated ? tabTotals[t.id] : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold">Add {singular}</h2>
        <p className="mb-4 mt-0.5 text-xs muted">{active.help}</p>
        <EntryForm kind={tab} key={tab} />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold">
          Your {active.label.toLowerCase()}
          {hydrated && filtered.length > 0 && (
            <span className="ml-2 font-normal muted">
              · {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </span>
          )}
        </h2>
        {hydrated ? (
          <EntryList kind={tab} entries={filtered} />
        ) : (
          <div className="muted">Loading…</div>
        )}
      </div>
    </div>
  );
}
