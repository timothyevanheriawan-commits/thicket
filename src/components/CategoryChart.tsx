"use client";

import { getCategoryColor } from "@/lib/constants";

type CategoryTotal = {
  category: string;
  total: number;
};

function formatIDRShort(amount: number) {
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}

// Small floor so low-spend categories still render a visible sliver instead
// of disappearing entirely next to the highest category.
const MIN_BAR_PERCENT = 4;

type CategoryChartProps = {
  data: CategoryTotal[];
  budgets?: Record<string, number>;
};

export default function CategoryChart({ data, budgets }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center rounded-soft bg-surface p-4 shadow-sm">
        <p className="font-display text-sm text-brown/50">
          Log an expense to see your breakdown here.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className="flex h-full flex-col rounded-soft bg-surface p-4 shadow-sm">
      <p className="mb-3 font-display text-sm font-medium text-sage-deep">
        By category
      </p>
      {/* justify-between only spends extra space when the parent is
          stretched (desktop md:row-span-3 via HomeDashboard). On mobile,
          where height is intrinsic, there's no extra space to distribute,
          so rows stay naturally compact instead of gapping out. */}
      <ul className="flex flex-1 flex-col justify-between gap-2.5">
        {data.map((d) => {
          const isMax = d.total === maxTotal;
          const budget = budgets?.[d.category];
          const isOverBudget = budget !== undefined && d.total > budget;
          const percent = Math.max(
            MIN_BAR_PERCENT,
            Math.round((d.total / maxTotal) * 100),
          );

          return (
            <li
              key={d.category}
              className="grid grid-cols-[minmax(0,4.5rem)_1fr_3.25rem] items-center gap-2.5"
            >
              <span
                className="truncate text-xs text-brown/70"
                title={d.category}
              >
                {d.category}
              </span>
              <div
                className={`h-4 w-full overflow-hidden rounded-full bg-bg ${
                  isOverBudget ? "ring-1 ring-clay/50" : ""
                }`}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: getCategoryColor(d.category),
                  }}
                />
              </div>
              <span
                className={`text-right text-xs font-medium ${
                  isOverBudget
                    ? "text-clay"
                    : isMax
                      ? "text-brown"
                      : "text-brown/80"
                }`}
                title={
                  isOverBudget
                    ? `Over budget (Rp ${formatIDRShort(budget!)} limit)`
                    : undefined
                }
              >
                Rp {formatIDRShort(d.total)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
