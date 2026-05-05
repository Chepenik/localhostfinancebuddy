import { newId } from "./storage";
import type { Entry } from "./types";

// Realistic-looking sample data so a fresh user can immediately
// see what the app does. The user can clear it with one click.
export function buildDemoEntries(): Entry[] {
  const now = Date.now();
  const e = (overrides: Partial<Entry> & Pick<Entry, "kind" | "name" | "amount" | "category">): Entry =>
    ({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as Entry);

  return [
    e({ kind: "income", name: "Day job", amount: 6500, category: "Salary", frequency: "monthly" }),
    e({ kind: "income", name: "Freelance design", amount: 800, category: "Freelance", frequency: "monthly" }),

    e({ kind: "expense", name: "Rent", amount: 1850, category: "Housing", frequency: "monthly", recurring: true }),
    e({ kind: "expense", name: "Groceries", amount: 520, category: "Food", frequency: "monthly" }),
    e({ kind: "expense", name: "Eating out", amount: 180, category: "Food", frequency: "monthly" }),
    e({ kind: "expense", name: "Gas + transit", amount: 140, category: "Transport", frequency: "monthly" }),
    e({ kind: "expense", name: "Electric + internet", amount: 165, category: "Utilities", frequency: "monthly", recurring: true }),
    e({ kind: "expense", name: "Health insurance", amount: 280, category: "Insurance", frequency: "monthly", recurring: true }),
    e({ kind: "expense", name: "Streaming services", amount: 42, category: "Subscriptions", frequency: "monthly", recurring: true }),
    e({ kind: "expense", name: "Gym", amount: 35, category: "Subscriptions", frequency: "monthly", recurring: true }),
    e({ kind: "expense", name: "Fun money", amount: 150, category: "Entertainment", frequency: "monthly" }),
    e({ kind: "expense", name: "Student loan payment", amount: 250, category: "Debt Payments", frequency: "monthly", recurring: true }),

    e({ kind: "asset", name: "Checking account", amount: 3200, category: "Checking" }),
    e({ kind: "asset", name: "High-yield savings", amount: 12500, category: "Savings Account" }),
    e({ kind: "asset", name: "Brokerage", amount: 24000, category: "Investments" }),
    e({ kind: "asset", name: "401(k)", amount: 41000, category: "Retirement" }),
    e({ kind: "asset", name: "Used car", amount: 9500, category: "Vehicle" }),

    e({ kind: "liability", name: "Student loans", amount: 18500, category: "Student Loan" }),
    e({ kind: "liability", name: "Credit card balance", amount: 1200, category: "Credit Card" }),
  ];
}
