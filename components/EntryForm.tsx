"use client";

import { useState } from "react";
import {
  ASSET_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  LIABILITY_CATEGORIES,
  type Entry,
  type EntryKind,
  type Frequency,
} from "@/lib/types";
import { addEntry, newId, updateEntry } from "@/lib/storage";

const KIND_COPY: Record<EntryKind, { title: string; nameHint: string; amountHint: string }> = {
  income: {
    title: "income",
    nameHint: "e.g. Day job, freelance, dividends",
    amountHint: "We'll convert this to a monthly figure for the dashboard.",
  },
  expense: {
    title: "expense",
    nameHint: "e.g. Rent, groceries, gym",
    amountHint: "We'll convert this to a monthly figure for the dashboard.",
  },
  asset: {
    title: "asset",
    nameHint: "e.g. Checking, 401(k), car",
    amountHint: "Use the current balance or estimated value.",
  },
  liability: {
    title: "liability",
    nameHint: "e.g. Credit card, student loan, mortgage",
    amountHint: "Use the current balance owed.",
  },
};

function categoriesFor(kind: EntryKind): readonly string[] {
  switch (kind) {
    case "income":
      return INCOME_CATEGORIES;
    case "expense":
      return EXPENSE_CATEGORIES;
    case "asset":
      return ASSET_CATEGORIES;
    case "liability":
      return LIABILITY_CATEGORIES;
  }
}

const MAX_AMOUNT = 1e12; // Sanity cap. A trillion ought to do it.

interface Props {
  kind: EntryKind;
  initial?: Entry;
  onDone?: () => void;
}

export function EntryForm({ kind, initial, onDone }: Props) {
  const cats = categoriesFor(kind);
  const copy = KIND_COPY[kind];

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState<string>(initial?.category ?? cats[0]);
  const [frequency, setFrequency] = useState<Frequency>(
    initial && (initial.kind === "income" || initial.kind === "expense")
      ? initial.frequency
      : "monthly",
  );
  const [recurring, setRecurring] = useState<boolean>(
    initial?.kind === "expense" ? Boolean(initial.recurring) : false,
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const clearError = () => {
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give it a name so you can recognize it later.");
      return;
    }
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError("Amount must be a positive number.");
      return;
    }
    if (value > MAX_AMOUNT) {
      setError("That's an awfully large number. Double-check the amount.");
      return;
    }

    const now = Date.now();
    const base = {
      id: initial?.id ?? newId(),
      name: trimmedName,
      amount: value,
      category,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };

    let entry: Entry;
    if (kind === "income") entry = { ...base, kind, frequency };
    else if (kind === "expense") entry = { ...base, kind, frequency, recurring };
    else if (kind === "asset") entry = { ...base, kind };
    else entry = { ...base, kind: "liability" };

    if (initial) updateEntry(entry);
    else addEntry(entry);

    if (!initial) {
      setName("");
      setAmount("");
      setNotes("");
    }
    onDone?.();
  };

  const showFrequency = kind === "income" || kind === "expense";

  return (
    <form onSubmit={handleSubmit} className="grid gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="entry-name">
            Name
          </label>
          <input
            id="entry-name"
            className="input"
            value={name}
            onChange={(e) => {
              clearError();
              setName(e.target.value);
            }}
            placeholder={copy.nameHint}
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="entry-amount">
            Amount
          </label>
          <input
            id="entry-amount"
            className="input tabular-nums"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              clearError();
              setAmount(e.target.value);
            }}
            placeholder="0.00"
          />
          <div className="mt-1 text-xs muted">{copy.amountHint}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="entry-category">
            Category
          </label>
          <select
            id="entry-category"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {showFrequency && (
          <div>
            <label className="label" htmlFor="entry-frequency">
              How often?
            </label>
            <select
              id="entry-frequency"
              className="input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              <option value="monthly">Every month</option>
              <option value="weekly">Every week</option>
              <option value="yearly">Every year</option>
              <option value="one-time">One time only</option>
            </select>
          </div>
        )}
      </div>

      {kind === "expense" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span>This is a recurring bill (rent, subscription, insurance…)</span>
        </label>
      )}

      <div>
        <label className="label" htmlFor="entry-notes">
          Notes <span className="muted">(optional)</span>
        </label>
        <textarea
          id="entry-notes"
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you want to remember…"
        />
      </div>

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            color: "var(--color-negative)",
            backgroundColor: "color-mix(in srgb, var(--color-negative) 10%, transparent)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary">
          {initial ? "Save changes" : `Add ${copy.title}`}
        </button>
        {onDone && (
          <button type="button" className="btn btn-ghost" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
