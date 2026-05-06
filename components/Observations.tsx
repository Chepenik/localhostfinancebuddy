"use client";

import type { Observation } from "@/lib/observations";

const TONE_COLOR: Record<Observation["tone"], string> = {
  positive: "var(--color-positive)",
  warning: "var(--color-warning)",
  info: "var(--color-accent)",
};

const TONE_LABEL: Record<Observation["tone"], string> = {
  positive: "Positive note",
  warning: "Worth attention",
  info: "Note",
};

export function Observations({
  observations,
  max = 5,
}: {
  observations: Observation[];
  max?: number;
}) {
  if (observations.length === 0) return null;
  const shown = observations.slice(0, max);

  return (
    <section
      className="card p-6"
      aria-labelledby="observations-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="observations-heading" className="text-sm font-semibold">
          Observations
        </h3>
        <p className="text-xs muted">
          Plain-language notes from your numbers — not financial advice.
        </p>
      </div>

      <ul className="mt-4 grid gap-4">
        {shown.map((o) => (
          <li
            key={o.id}
            className="flex gap-3"
          >
            <span
              aria-hidden
              className="mt-1 h-2 w-2 flex-none rounded-full"
              style={{ backgroundColor: TONE_COLOR[o.tone] }}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium">
                <span className="sr-only">{TONE_LABEL[o.tone]}: </span>
                {o.title}
              </div>
              <p className="mt-0.5 text-sm muted">{o.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
