export type CurrencyFormat = "standard" | "comma" | "compact";

export function formatIDR(amount: number, format: CurrencyFormat = "standard") {
  if (format === "comma") {
    // Same digits as "standard", comma thousands separator instead of
    // period — for people more used to US-style grouping.
    return `Rp ${amount.toLocaleString("en-US")}`;
  }

  if (format === "compact") {
    if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      const trimmed =
        millions % 1 === 0 ? millions.toString() : millions.toFixed(1);
      return `Rp ${trimmed}jt`;
    }
    if (amount >= 1_000) {
      return `Rp ${Math.round(amount / 1000)}k`;
    }
    return `Rp ${amount}`;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isThisWeek(date: Date) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  return date >= sevenDaysAgo && date <= now;
}

// The 7-day window immediately preceding isThisWeek's rolling window, used
// for week-over-week comparisons. Kept as a trailing window (not calendar
// Mon-Sun) to stay consistent with isThisWeek's own definition above.
export function isLastWeek(date: Date) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);
  return date >= fourteenDaysAgo && date < sevenDaysAgo;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  if (isThisWeek(date)) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function formatDueLabel(due: Date): { text: string; overdue: boolean } {
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      text: diffDays === -1 ? "Overdue 1d" : `Overdue ${-diffDays}d`,
      overdue: true,
    };
  }
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  if (diffDays < 7) {
    return {
      text: `Due ${dueDay.toLocaleDateString("en-US", { weekday: "short" })}`,
      overdue: false,
    };
  }
  return {
    text: `Due ${dueDay.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`,
    overdue: false,
  };
}

export function formatDayLabel(date: Date): string {
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  if (isThisWeek(date)) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
