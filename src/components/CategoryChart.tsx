"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type CategoryTotal = {
  category: string;
  total: number;
};

function formatIDRShort(amount: number) {
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}

// Shortens long category labels so rotated ticks don't collide on narrow
// (mobile) chart widths. Full name is still shown in the legend list below.
function shortenLabel(category: string): string {
  if (category.length <= 6) return category;
  return `${category.slice(0, 5)}.`;
}

export default function CategoryChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center rounded-[var(--radius-soft)] bg-surface p-4 shadow-sm">
        <p className="font-display text-sm text-brown/50">
          Log an expense to see your breakdown here.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className="flex h-full flex-col rounded-[var(--radius-soft)] bg-surface p-4 shadow-sm">
      <p className="mb-3 font-display text-sm font-medium text-sage-deep">
        By category
      </p>
      <div className="h-44 w-full md:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <XAxis
              dataKey="category"
              tickFormatter={shortenLabel}
              tick={{ fill: "var(--brown)", fontSize: 10 }}
              axisLine={{
                stroke: "color-mix(in srgb, var(--brown) 15%, transparent)",
              }}
              tickLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={48}
            />
            <Tooltip
              cursor={{
                fill: "color-mix(in srgb, var(--sage) 12%, transparent)",
              }}
              contentStyle={{
                background: "var(--bg)",
                border:
                  "1px solid color-mix(in srgb, var(--brown) 15%, transparent)",
                borderRadius: "var(--radius-soft)",
                fontSize: 12,
                color: "var(--brown)",
              }}
              // Full category name always shown in the tooltip, even though
              // the axis tick itself may be shortened on narrow screens.
              labelFormatter={(label) => label}
              formatter={(value) => [
                `Rp ${Number(value).toLocaleString("id-ID")}`,
                "Spent",
              ]}
              labelStyle={{ color: "var(--sage-deep)", fontWeight: 500 }}
            />
            <Bar
              dataKey="total"
              radius={[6, 6, 6, 6]}
              background={{ fill: "var(--bg)", radius: 6 }}
            >
              {data.map((d) => (
                <Cell
                  key={d.category}
                  fill={d.total === maxTotal ? "var(--clay)" : "var(--sage)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {data.map((d) => (
          <li
            key={d.category}
            className="flex items-center justify-between text-xs text-brown/60"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    d.total === maxTotal ? "var(--clay)" : "var(--sage)",
                }}
              />
              {d.category}
            </span>
            <span className="font-medium text-brown/80">
              Rp {formatIDRShort(d.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
