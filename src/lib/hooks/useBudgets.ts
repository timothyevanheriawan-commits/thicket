"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Budgets = {
  weekly: number | null;
  categories: Record<string, number>;
};

const DEFAULT_BUDGETS: Budgets = { weekly: null, categories: {} };

function isBudgets(value: unknown): value is Budgets {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const weeklyOk = v.weekly === null || typeof v.weekly === "number";
  const categoriesOk =
    typeof v.categories === "object" &&
    v.categories !== null &&
    !Array.isArray(v.categories);
  return weeklyOk && categoriesOk;
}

/**
 * Loads and persists weekly + per-category budget thresholds, used to
 * trigger the soft over-budget color shift in HomeDashboard/CategoryChart.
 * Stored on auth user_metadata (same place display_name and
 * currency_format already live) — thresholds are a small preference, not
 * worth a schema change.
 */
export function useBudgets() {
  const [budgets, setBudgetsState] = useState<Budgets>(DEFAULT_BUDGETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      // Same session-hydration guard as useEntries/useCategories/
      // useCurrencyFormat — avoids reading a stale/absent user right after
      // a hard-navigation login.
      await supabase.auth.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      const stored = user?.user_metadata?.budgets;
      if (isBudgets(stored)) {
        setBudgetsState(stored);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Budgets) => {
    setBudgetsState(next); // optimistic — callers own their own save state
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { budgets: next } });
  }, []);

  const setWeeklyBudget = useCallback(
    (value: number | null) => {
      persist({ ...budgets, weekly: value });
    },
    [budgets, persist],
  );

  const setCategoryBudget = useCallback(
    (category: string, value: number | null) => {
      const nextCategories = { ...budgets.categories };
      if (value === null) {
        delete nextCategories[category];
      } else {
        nextCategories[category] = value;
      }
      persist({ ...budgets, categories: nextCategories });
    },
    [budgets, persist],
  );

  return {
    weeklyBudget: budgets.weekly,
    categoryBudgets: budgets.categories,
    setWeeklyBudget,
    setCategoryBudget,
    loading,
  };
}
