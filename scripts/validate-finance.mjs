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
import { buildAiInsightsPayload, AI_SYSTEM_PROMPT } from "../lib/insights.ts";
import { buildObservations } from "../lib/observations.ts";

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

console.log("\nbuildAiInsightsPayload");

// Sensitive sample data — entry names and notes must never appear in the
// payload that would be sent to an AI provider.
const sensitiveEntries = [
  {
    id: "i1",
    kind: "income",
    name: "MEGA-EMPLOYER LLC payroll",
    amount: 5000,
    category: "Salary",
    frequency: "monthly",
    notes: "EMPLOYEE_ID_18472 secret",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "e1",
    kind: "expense",
    name: "RENT for 123 Acacia Ave",
    amount: 1500,
    category: "Housing",
    frequency: "monthly",
    notes: "landlord-Mr-Smith",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "a1",
    kind: "asset",
    name: "Chase Sapphire Checking ****4321",
    amount: 5000,
    category: "Checking",
    notes: "routing-99887766",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "l1",
    kind: "liability",
    name: "Amex Platinum balance",
    amount: 1200,
    category: "Credit Card",
    notes: "card last 4: 1234",
    createdAt: 0,
    updatedAt: 0,
  },
];

const SENSITIVE_TOKENS = [
  "MEGA-EMPLOYER",
  "EMPLOYEE_ID_18472",
  "Acacia Ave",
  "landlord-Mr-Smith",
  "Chase Sapphire",
  "4321",
  "routing-99887766",
  "Amex Platinum",
  "card last 4",
  "1234",
];

check("default payload has the expected top-level shape", () => {
  const p = buildAiInsightsPayload(sensitiveEntries);
  const keys = Object.keys(p).sort();
  assert.deepEqual(keys, [
    "debtToAssetRatio",
    "entryCount",
    "generatedAt",
    "monthlyCashFlow",
    "monthlyExpenses",
    "monthlyIncome",
    "netWorth",
    "savingsRate",
    "totalAssets",
    "totalLiabilities",
  ]);
  assert.equal(typeof p.netWorth, "number");
  assert.equal(typeof p.entryCount, "number");
  assert.equal(typeof p.generatedAt, "string");
  assert.match(p.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

check("default payload excludes raw entry names and notes", () => {
  const p = buildAiInsightsPayload(sensitiveEntries);
  const json = JSON.stringify(p);
  for (const token of SENSITIVE_TOKENS) {
    assert.equal(
      json.includes(token),
      false,
      `payload leaked sensitive token: ${token}`,
    );
  }
});

check("includeCategories adds aggregates with only category/amount fields", () => {
  const p = buildAiInsightsPayload(sensitiveEntries, { includeCategories: true });
  assert.ok(Array.isArray(p.expenseCategories));
  assert.ok(Array.isArray(p.assetCategories));
  assert.ok(Array.isArray(p.liabilityCategories));
  for (const c of p.expenseCategories) {
    assert.deepEqual(Object.keys(c).sort(), ["category", "monthlyAmount"]);
    assert.equal(typeof c.category, "string");
    assert.equal(typeof c.monthlyAmount, "number");
  }
  for (const c of p.assetCategories) {
    assert.deepEqual(Object.keys(c).sort(), ["amount", "category"]);
  }
  for (const c of p.liabilityCategories) {
    assert.deepEqual(Object.keys(c).sort(), ["amount", "category"]);
  }
});

check("includeCategories still excludes entry names and notes", () => {
  const p = buildAiInsightsPayload(sensitiveEntries, { includeCategories: true });
  const json = JSON.stringify(p);
  for (const token of SENSITIVE_TOKENS) {
    assert.equal(
      json.includes(token),
      false,
      `payload leaked sensitive token even with categories: ${token}`,
    );
  }
});

check("empty entries → entryCount 0 and zero aggregates", () => {
  const p = buildAiInsightsPayload([]);
  assert.equal(p.entryCount, 0);
  assert.equal(p.netWorth, 0);
  assert.equal(p.monthlyIncome, 0);
  assert.equal(p.monthlyExpenses, 0);
  assert.equal(p.savingsRate, null);
  assert.equal(p.debtToAssetRatio, null);
});

check("amounts are rounded to cents", () => {
  // Weekly income of 100 → 100 * 52 / 12 = 433.3333… → rounded to 433.33
  const p = buildAiInsightsPayload([
    {
      id: "x",
      kind: "income",
      name: "n/a",
      amount: 100,
      category: "Salary",
      frequency: "weekly",
      createdAt: 0,
      updatedAt: 0,
    },
  ]);
  assert.equal(p.monthlyIncome, Math.round(((100 * 52) / 12) * 100) / 100);
});

check("system prompt forbids investment advice", () => {
  // Defensive check — if someone weakens the system prompt later, this fails.
  assert.match(AI_SYSTEM_PROMPT, /not financial/i);
  assert.match(AI_SYSTEM_PROMPT, /not.*investment/i);
  assert.match(AI_SYSTEM_PROMPT, /Do not recommend/i);
});

console.log("\nbuildObservations");

const obs = (entries) => buildObservations(entries);
const ids = (list) => list.map((o) => o.id);

check("zero entries → no observations", () => {
  assert.deepEqual(obs([]), []);
});

check("few entries → onboarding nudge", () => {
  const list = obs([e("asset", 1000)]);
  assert.ok(ids(list).includes("few-entries"));
});

check("strong saver → positive cash-flow + savings-rate-strong", () => {
  const list = obs([
    e("income", 10000, { frequency: "monthly" }),
    e("expense", 4000, { frequency: "monthly" }),
    e("asset", 50000, { category: "Checking" }),
    e("liability", 5000),
  ]);
  const got = ids(list);
  assert.ok(got.includes("cash-flow-positive"));
  assert.ok(got.includes("savings-rate-strong"));
  assert.ok(got.includes("debt-low"));
  // No "few-entries" warning when there are >=4 entries.
  assert.ok(!got.includes("few-entries"));
});

check("spending exceeds income → warning observation", () => {
  const list = obs([
    e("income", 3000, { frequency: "monthly" }),
    e("expense", 4000, { frequency: "monthly", category: "Housing" }),
    e("asset", 1000, { category: "Checking" }),
    e("liability", 100),
  ]);
  const got = ids(list);
  assert.ok(got.includes("cash-flow-negative"));
});

check("emergency fund: only liquid assets count", () => {
  const list = obs([
    e("income", 5000, { frequency: "monthly" }),
    e("expense", 4000, { frequency: "monthly" }),
    // 100k in investments — NOT counted as liquid.
    e("asset", 100000, { category: "Investments" }),
    // 4k in checking — counted. 4k / 4k = 1.0 month → warning.
    e("asset", 4000, { category: "Checking" }),
  ]);
  const note = list.find((o) => o.id === "emergency-fund");
  assert.ok(note, "emergency-fund observation should be present");
  assert.equal(note.tone, "warning");
});

check("emergency fund 6+ months → positive", () => {
  const list = obs([
    e("income", 5000, { frequency: "monthly" }),
    e("expense", 1000, { frequency: "monthly" }),
    e("asset", 50000, { category: "Savings Account" }),
  ]);
  const note = list.find((o) => o.id === "emergency-fund");
  assert.ok(note);
  assert.equal(note.tone, "positive");
});

check("expense concentration only flags >35% share", () => {
  const dominant = obs([
    e("income", 10000, { frequency: "monthly" }),
    e("expense", 5000, { frequency: "monthly", category: "Housing" }),
    e("expense", 200, { frequency: "monthly", category: "Food" }),
    e("expense", 100, { frequency: "monthly", category: "Transport" }),
  ]);
  assert.ok(ids(dominant).includes("expense-concentration"));

  // Largest category ≈ 30% of the total — under the 35% threshold.
  const balanced = obs([
    e("income", 10000, { frequency: "monthly" }),
    e("expense", 900, { frequency: "monthly", category: "Housing" }),
    e("expense", 800, { frequency: "monthly", category: "Food" }),
    e("expense", 700, { frequency: "monthly", category: "Transport" }),
    e("expense", 600, { frequency: "monthly", category: "Utilities" }),
  ]);
  assert.ok(!ids(balanced).includes("expense-concentration"));
});

check("one-time flow entries surface a reminder", () => {
  const list = obs([
    e("income", 5000, { frequency: "monthly" }),
    e("income", 1500, { frequency: "one-time" }),
    e("expense", 1000, { frequency: "monthly" }),
    e("asset", 1000, { category: "Checking" }),
  ]);
  const note = list.find((o) => o.id === "one-time-note");
  assert.ok(note);
  assert.match(note.title, /1 one-time entry/);
});

check("debts but no assets surfaces an asset prompt", () => {
  const list = obs([e("liability", 2000), e("liability", 500)]);
  assert.ok(ids(list).includes("debt-no-assets"));
});

check("observations never contain raw entry name or notes", () => {
  // Defensive: someone could later be tempted to template entry text into
  // observation copy. Make sure that doesn't sneak in.
  const list = obs([
    {
      id: "x",
      kind: "expense",
      name: "MEGA-LANDLORD-CO secret payment",
      amount: 4000,
      category: "Housing",
      frequency: "monthly",
      notes: "very-private-note-12345",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "y",
      kind: "income",
      name: "MEGA-EMPLOYER",
      amount: 5000,
      category: "Salary",
      frequency: "monthly",
      notes: "secret-id-998877",
      createdAt: 0,
      updatedAt: 0,
    },
    e("asset", 5000, { category: "Checking" }),
  ]);
  const json = JSON.stringify(list);
  for (const token of [
    "MEGA-LANDLORD-CO",
    "very-private-note-12345",
    "MEGA-EMPLOYER",
    "secret-id-998877",
  ]) {
    assert.equal(json.includes(token), false, `observations leaked: ${token}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
