interface Props {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}

export function MetricTile({ label, value, hint, tone = "default" }: Props) {
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
    </div>
  );
}
