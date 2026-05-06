interface Props {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  // Optional plain-language definition. Renders as an accessible disclosure
  // ("What's this?") under the hint. Native <details> — no JS required.
  definition?: string;
}

export function MetricTile({ label, value, hint, tone = "default", definition }: Props) {
  const valueColor =
    tone === "positive"
      ? "var(--color-positive)"
      : tone === "negative"
        ? "var(--color-negative)"
        : "var(--color-fg)";
  return (
    <div className="card p-5">
      <div className="text-[11px] font-medium uppercase tracking-wider muted">{label}</div>
      <div
        className="mt-1.5 text-2xl font-semibold tabular-nums sm:text-[1.65rem]"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs muted">{hint}</div>}
      {definition && (
        <details className="mt-2 group">
          <summary
            className="cursor-pointer list-none text-xs font-medium select-none"
            style={{ color: "var(--color-accent)" }}
          >
            <span className="group-open:hidden">What&apos;s this?</span>
            <span className="hidden group-open:inline">Hide</span>
          </summary>
          <p className="mt-1.5 text-xs muted leading-relaxed">{definition}</p>
        </details>
      )}
    </div>
  );
}
