export type EntryKind = "income" | "expense" | "asset" | "liability";

// Frequency only matters for income/expense entries.
// Assets/liabilities are point-in-time balances.
export type Frequency = "monthly" | "weekly" | "yearly" | "one-time";

const FREQUENCIES: readonly Frequency[] = ["monthly", "weekly", "yearly", "one-time"];

// Coarse categories. Short and friendly. `category` is just the
// bucket used for chart grouping — names are the user's truth.
export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment Income",
  "Gifts",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Insurance",
  "Healthcare",
  "Entertainment",
  "Subscriptions",
  "Debt Payments",
  "Savings",
  "Other",
] as const;

export const ASSET_CATEGORIES = [
  "Cash",
  "Checking",
  "Savings Account",
  "Investments",
  "Retirement",
  "Real Estate",
  "Vehicle",
  "Other",
] as const;

export const LIABILITY_CATEGORIES = [
  "Mortgage",
  "Student Loan",
  "Credit Card",
  "Auto Loan",
  "Personal Loan",
  "Other",
] as const;

export interface BaseEntry {
  id: string;
  kind: EntryKind;
  name: string;
  amount: number;
  category: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IncomeEntry extends BaseEntry {
  kind: "income";
  frequency: Frequency;
}

export interface ExpenseEntry extends BaseEntry {
  kind: "expense";
  frequency: Frequency;
  recurring?: boolean;
}

export interface AssetEntry extends BaseEntry {
  kind: "asset";
}

export interface LiabilityEntry extends BaseEntry {
  kind: "liability";
}

export type Entry = IncomeEntry | ExpenseEntry | AssetEntry | LiabilityEntry;

export interface AppState {
  version: 1;
  entries: Entry[];
}

export const EMPTY_STATE: AppState = { version: 1, entries: [] };

// Runtime entry validator. Returns a normalized entry or null.
// Used by storage and import to reject corrupt rows without crashing the app.
export function coerceEntry(value: unknown): Entry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const kind = v.kind;
  if (kind !== "income" && kind !== "expense" && kind !== "asset" && kind !== "liability") {
    return null;
  }
  if (typeof v.id !== "string" || !v.id) return null;
  if (typeof v.name !== "string") return null;
  if (typeof v.amount !== "number" || !Number.isFinite(v.amount) || v.amount < 0) return null;
  if (typeof v.category !== "string" || !v.category) return null;

  const createdAt = typeof v.createdAt === "number" ? v.createdAt : Date.now();
  const updatedAt = typeof v.updatedAt === "number" ? v.updatedAt : createdAt;
  const notes = typeof v.notes === "string" && v.notes ? v.notes : undefined;

  if (kind === "income" || kind === "expense") {
    const freq = v.frequency;
    if (typeof freq !== "string" || !FREQUENCIES.includes(freq as Frequency)) return null;
    if (kind === "income") {
      return {
        kind,
        id: v.id,
        name: v.name,
        amount: v.amount,
        category: v.category,
        notes,
        createdAt,
        updatedAt,
        frequency: freq as Frequency,
      };
    }
    return {
      kind,
      id: v.id,
      name: v.name,
      amount: v.amount,
      category: v.category,
      notes,
      createdAt,
      updatedAt,
      frequency: freq as Frequency,
      recurring: typeof v.recurring === "boolean" ? v.recurring : undefined,
    };
  }

  return {
    kind,
    id: v.id,
    name: v.name,
    amount: v.amount,
    category: v.category,
    notes,
    createdAt,
    updatedAt,
  };
}
