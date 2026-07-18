"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES as BUILT_IN_CATEGORIES } from "@/lib/constants";
import type { Category } from "@/lib/hooks/useEntries";

export type CustomCategory = {
  id: string;
  name: Category;
};

// name is typed as Category (not string) so this row shape matches
// CustomCategory — Supabase can't know our app-level category union at
// compile time, so this is where we assert the DB value fits it.
type CategoryRow = {
  id: string;
  name: Category;
};

/**
 * User-created categories, layered on top of the fixed built-in list
 * (Food, Shopping, Transport, Savings, Entertainment, Bills).
 * Built-ins are not stored in Supabase and can't be deleted; custom
 * categories live in the `categories` table, scoped per-user via RLS.
 */
export function useCategories() {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        setCustomCategories(data as CategoryRow[]);
        setError(null);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Full list shown in the UI: built-ins first, then custom ones in creation order.
  const allCategories: Category[] = [
    ...BUILT_IN_CATEGORIES,
    ...customCategories.map((c) => c.name),
  ];

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      // Avoid duplicates against both built-ins and existing custom categories
      // (case-insensitive, since "food" and "Food" would otherwise look like two chips).
      const isDuplicate = [
        ...BUILT_IN_CATEGORIES,
        ...customCategories.map((c) => c.name),
      ].some((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (isDuplicate) {
        setError(`"${trimmed}" already exists.`);
        return null;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const optimisticId = crypto.randomUUID();
      // `trimmed` is free-text user input; custom category names are
      // inherently outside the fixed built-in union, so this is the
      // deliberate boundary where that input enters the typed world.
      setCustomCategories((prev) => [
        ...prev,
        { id: optimisticId, name: trimmed as Category },
      ]);

      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: trimmed })
        .select("id, name")
        .single();

      if (error || !data) {
        setCustomCategories((prev) =>
          prev.filter((c) => c.id !== optimisticId),
        );
        setError(error?.message ?? "Failed to add category");
        return null;
      }

      const final = data as CategoryRow;
      setCustomCategories((prev) =>
        prev.map((c) => (c.id === optimisticId ? final : c)),
      );
      return final;
    },
    [customCategories],
  );

  const deleteCategory = useCallback(async (id: string) => {
    const supabase = createClient();
    let removed: CustomCategory | undefined;
    let removedIndex = -1;

    setCustomCategories((prev) => {
      removedIndex = prev.findIndex((c) => c.id === id);
      removed = prev[removedIndex];
      return prev.filter((c) => c.id !== id);
    });

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error && removed) {
      const toRestore = removed;
      const insertAt = removedIndex;
      setCustomCategories((prev) => {
        const next = [...prev];
        next.splice(insertAt, 0, toRestore);
        return next;
      });
      setError(error.message);
    }
  }, []);

  return {
    customCategories,
    allCategories,
    loading,
    error,
    addCategory,
    deleteCategory,
    clearError,
  };
}
