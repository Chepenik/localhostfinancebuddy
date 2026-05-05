"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryBreakdown } from "@/lib/finance";
import { formatCurrency } from "@/lib/finance";

const COLORS = [
  "var(--color-c1)",
  "var(--color-c2)",
  "var(--color-c3)",
  "var(--color-c4)",
  "var(--color-c5)",
  "var(--color-c6)",
  "var(--color-c7)",
  "var(--color-c8)",
];

export function CategoryPie({ data }: { data: CategoryBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm muted"
        style={{ borderColor: "var(--color-border)" }}
      >
        No data yet.
      </div>
    );
  }

  // No padding gap for a single slice — otherwise the ring looks broken.
  const paddingAngle = data.length > 1 ? 2 : 0;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={paddingAngle}
            stroke="var(--color-surface)"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-fg) 6%, transparent)" }}
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              color: "var(--color-fg)",
              boxShadow:
                "0 1px 2px color-mix(in srgb, var(--color-fg) 8%, transparent), 0 6px 16px color-mix(in srgb, var(--color-fg) 10%, transparent)",
            }}
            // Force readable text inside the tooltip — Recharts defaults each
            // row's color to the slice color, which can be near-invisible on
            // dark mode.
            itemStyle={{ color: "var(--color-fg)" }}
            labelStyle={{ color: "var(--color-muted)" }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            // Render legend labels in the foreground color so they stay
            // readable; only the icon uses the slice color.
            formatter={(value: string) => (
              <span style={{ color: "var(--color-fg)" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
