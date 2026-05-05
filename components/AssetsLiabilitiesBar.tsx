"use client";

import { formatCurrency, formatPercent } from "@/lib/finance";

interface Props {
  assets: number;
  liabilities: number;
}

// Apple-style proportional split bar. Reads at a glance:
// "out of everything I track, X% is on the asset side."
export function AssetsLiabilitiesBar({ assets, liabilities }: Props) {
  const total = assets + liabilities;
  const empty = total === 0;
  const assetPct = empty ? 0.5 : assets / total;
  const ratio = assets > 0 ? liabilities / assets : null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider muted">
            Assets vs. liabilities
          </div>
          <div className="mt-0.5 text-sm muted">
            {empty
              ? "Add assets and debts to see the split."
              : ratio === null
                ? "All liabilities, no assets yet."
                : `For every $1 of assets, you owe ${formatCurrency(ratio)}.`}
          </div>
        </div>
        <div className="text-right text-xs muted">
          <div>
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--color-positive)" }}
            />{" "}
            {formatCurrency(assets)}
          </div>
          <div className="mt-0.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--color-negative)" }}
            />{" "}
            {formatCurrency(liabilities)}
          </div>
        </div>
      </div>

      <div
        className="relative mt-4 h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={
          empty
            ? "No data yet"
            : `${formatPercent(assetPct)} assets, ${formatPercent(1 - assetPct)} liabilities`
        }
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500"
          style={{
            width: `${assetPct * 100}%`,
            backgroundColor: empty ? "var(--color-border)" : "var(--color-positive)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 transition-[width] duration-500"
          style={{
            width: `${(1 - assetPct) * 100}%`,
            backgroundColor: empty ? "var(--color-border)" : "var(--color-negative)",
            opacity: empty ? 0.6 : 1,
          }}
        />
      </div>
    </div>
  );
}
