// Lightweight assertion-based validator for the finance + storage logic.
// Run with `npm run validate` — no test runner needed for v1.
// Uses Node's experimental TS stripping (Node 22.6+) so no extra deps.

import assert from "node:assert/strict";
import {
  toMonthly,
  summarize,
  formatCurrency,
  formatPercent,
  formatSigned,
  formatCurrencyCompact,
} from "../lib/finance.ts";
import { coerceEntry } from "../lib/types.ts";

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error("    " + (err instanceof Error ? err.message : err));
  }
}

console.log("\ntoMonthly");
check("monthly is identity", () => assert.equal(toMonthly(100, "monthly"), 100));
check("yearly is /12", () => assert.equal(toMonthly(1200, "yearly"), 100));
check("weekly is *52/12", () => assert.equal(toMonthly(100, "weekly"), (100 * 52) / 12));
check("one-time is 0", () => assert.equal(toMonthly(500, "one-time"), 0));
check("negative amount becomes 0", () => assert.equal(toMonthly(-50, "monthly"), 0));
check("NaN becomes 0", () => assert.equal(toMonthly(Number.NaN, "monthly"), 0));
check("Infinity becomes 0", () => assert.equal(toMonthly(Infinity, "monthly"), 0));

console.log("\nsummarize – empty");
check("zero entries → safe summary", () => {
  const s = summarize([]);
  assert.equal(s.monthlyIncome, 0);
  assert.equal(s.monthlyExpenses, 0);
  assert.equal(s.netWorth, 0);
  assert.equal(s.debtToAssetRatio, null);
  assert.equal(s.savingsRate, null);
  assert.equal(s.health, "n/a");
  assert.equal(s.projectedNetWorth12m, null);
  assert.equal(s.hasAny, false);
});

const e = (kind, amount, extras = {}) => ({
  id: Math.random().toString(36).slice(2),
  kind,
  name: "Item",
  amount,
  category: "Other",
  createdAt: 0,
  updatedAt: 0,
  ...extras,
});

console.log("\nsummarize – flows");
check("net worth = assets − liabilities", () => {
  const s = summarize([e("asset", 1000), e("liability", 400)]);
  assert.equal(s.netWorth, 600);
});

check("monthly cash flow = income − expenses", () => {
  const s = summarize([
    e("income", 5000, { frequency: "monthly" }),
    e("expense", 3000, { frequency: "monthly" }),
  ]);
  assert.equal(s.monthlyCashFlow, 2000);
});

check("zero income → savings rate is null (no division by zero)", () => {
  const s = summarize([e("expense", 500, { frequency: "monthly" })]);
  assert.equal(s.savingsRate, null);
  assert.equal(s.monthlyCashFlow, -500);
});

check("zero assets → debt-to-asset is null", () => {
  const s = summarize([e("liability", 1000)]);
  assert.equal(s.debtToAssetRatio, null);
  assert.equal(s.netWorth, -1000);
});

check("liabilities > assets → negative net worth, ratio > 1", () => {
  const s = summarize([e("asset", 1000), e("liability", 4000)]);
  assert.equal(s.netWorth, -3000);
  assert.equal(s.debtToAssetRatio, 4);
});

check("savings rate handles cash flow > income (zero expenses, positive income)", () => {
  const s = summarize([e("income", 6000, { frequency: "monthly" })]);
  assert.equal(s.savingsRate, 1);
  assert.equal(s.health, "good");
});

check("yearly income mixes correctly with monthly expenses", () => {
  const s = summarize([
    e("income", 60000, { frequency: "yearly" }),
    e("expense", 4000, { frequency: "monthly" }),
  ]);
  assert.equal(s.monthlyIncome, 5000);
  assert.equal(s.monthlyCashFlow, 1000);
  assert.equal(s.savingsRate, 0.2);
});

check("weekly income converts via *52/12", () => {
  const s = summarize([e("income", 1200, { frequency: "weekly" })]);
  assert.equal(s.monthlyIncome, (1200 * 52) / 12);
});

check("one-time entries do not inflate the monthly run-rate", () => {
  const s = summarize([
    e("income", 5000, { frequency: "monthly" }),
    e("income", 100000, { frequency: "one-time" }),
  ]);
  assert.equal(s.monthlyIncome, 5000);
});

check("very large numbers stay finite", () => {
  const s = summarize([e("asset", 1e12), e("liability", 1e9)]);
  assert.equal(s.netWorth, 1e12 - 1e9);
  assert.ok(Number.isFinite(s.netWorth));
});

check("decimals survive round-trip", () => {
  const s = summarize([
    e("income", 1234.56, { frequency: "monthly" }),
    e("expense", 12.34, { frequency: "monthly" }),
  ]);
  assert.equal(s.monthlyCashFlow, 1234.56 - 12.34);
});

check("12-month projection extrapolates correctly", () => {
  const s = summarize([
    e("asset", 10000),
    e("income", 4000, { frequency: "monthly" }),
    e("expense", 3000, { frequency: "monthly" }),
  ]);
  assert.equal(s.projectedNetWorth12m, 10000 + 1000 * 12);
});

check("12-month projection is null when there's no flow data", () => {
  const s = summarize([e("asset", 1000)]);
  assert.equal(s.projectedNetWorth12m, null);
});

console.log("\nhealth rating");
check("only liabilities → 'tight'", () => {
  assert.equal(summarize([e("liability", 5000)]).health, "tight");
});
check("balanced surplus → at least 'good'", () => {
  const s = summarize([
    e("income", 5000, { frequency: "monthly" }),
    e("expense", 3000, { frequency: "monthly" }),
    e("asset", 10000),
  ]);
  assert.ok(["good", "great"].includes(s.health));
});
check("strong saver → 'great'", () => {
  const s = summarize([
    e("income", 10000, { frequency: "monthly" }),
    e("expense", 5000, { frequency: "monthly" }),
    e("asset", 50000),
    e("liability", 5000),
  ]);
  assert.equal(s.health, "great");
});
check("spending exceeds income → 'tight'", () => {
  const s = summarize([
    e("income", 3000, { frequency: "monthly" }),
    e("expense", 4000, { frequency: "monthly" }),
  ]);
  assert.equal(s.health, "tight");
});

console.log("\nformatting");
check("formatCurrency on Infinity → em dash", () => assert.equal(formatCurrency(Infinity), "—"));
check("formatCurrency on NaN → em dash", () => assert.equal(formatCurrency(Number.NaN), "—"));
check("formatPercent on null → em dash", () => assert.equal(formatPercent(null), "—"));
check("formatPercent rounds", () => assert.equal(formatPercent(0.235), "24%"));
check("formatSigned positive prefixes +", () => assert.match(formatSigned(100), /^\+/));
check("formatSigned negative does not prefix +", () =>
  assert.doesNotMatch(formatSigned(-100), /^\+/),
);
check("formatCurrencyCompact for big numbers", () => {
  const s = formatCurrencyCompact(1_500_000);
  assert.match(s, /M/);
});
check("formatCurrencyCompact for small numbers stays normal", () => {
  const s = formatCurrencyCompact(120);
  assert.doesNotMatch(s, /[KMB]/);
});

console.log("\ncoerceEntry");
check("rejects null", () => assert.equal(coerceEntry(null), null));
check("rejects unknown kind", () => assert.equal(coerceEntry({ kind: "x" }), null));
check("rejects negative amount", () =>
  assert.equal(
    coerceEntry({
      id: "1",
      kind: "income",
      name: "x",
      amount: -1,
      category: "Salary",
      frequency: "monthly",
    }),
    null,
  ),
);
check("rejects missing frequency on income", () =>
  assert.equal(
    coerceEntry({
      id: "1",
      kind: "income",
      name: "x",
      amount: 100,
      category: "Salary",
    }),
    null,
  ),
);
check("accepts valid asset", () => {
  const out = coerceEntry({
    id: "1",
    kind: "asset",
    name: "Cash",
    amount: 100,
    category: "Cash",
  });
  assert.ok(out);
  assert.equal(out.kind, "asset");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
