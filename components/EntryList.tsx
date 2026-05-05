"use client";

import { useState } from "react";
import { deleteEntry } from "@/lib/storage";
import type { Entry, EntryKind } from "@/lib/types";
import { formatCurrency, toMonthly } from "@/lib/finance";
import { EntryForm } from "./EntryForm";

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: "/mo",
  weekly: "/wk",
  yearly: "/yr",
  "one-time": "once",
};

export function EntryList({ kind, entries }: { kind: EntryKind; entries: Entry[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed p-6 text-sm muted"
        style={{ borderColor: "var(--color-border)" }}
      >
        Nothing here yet. Add your first {kind} above.
      </div>
    );
  }

  return (
    <ul
      className="divide-y"
      style={{ borderColor: "var(--color-border)", borderTop: "1px solid var(--color-border)" }}
    >
      {entries.map((e) => {
        const isEditing = editingId === e.id;
        if (isEditing) {
          return (
            <li key={e.id} className="py-4">
              <EntryForm kind={kind} initial={e} onDone={() => setEditingId(null)} />
            </li>
          );
        }
        const monthly =
          (e.kind === "income" || e.kind === "expense") && e.frequency !== "monthly"
            ? toMonthly(e.amount, e.frequency)
            : null;
        const freqSuffix =
          e.kind === "income" || e.kind === "expense"
            ? FREQUENCY_LABEL[e.frequency] ?? ""
            : "";

        return (
          <li
            key={e.id}
            className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{e.name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                >
                  {e.category}
                </span>
                {e.kind === "expense" && e.recurring && (
                  <span className="text-xs muted">recurring</span>
                )}
              </div>
              {e.notes && <div className="mt-0.5 truncate text-xs muted">{e.notes}</div>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right tabular-nums">
                <div className="font-semibold">
                  {formatCurrency(e.amount)}{" "}
                  {freqSuffix && <span className="text-xs muted">{freqSuffix}</span>}
                </div>
                {monthly !== null && (
                  <div className="text-xs muted">≈ {formatCurrency(monthly)}/mo</div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingId(e.id)}
                  aria-label={`Edit ${e.name}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (confirm(`Delete "${e.name}"?`)) deleteEntry(e.id);
                  }}
                  style={{ color: "var(--color-negative)" }}
                  aria-label={`Delete ${e.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
