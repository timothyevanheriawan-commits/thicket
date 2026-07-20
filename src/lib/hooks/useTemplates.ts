"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, EntryType } from "@/lib/hooks/useEntries";

export type Template = {
  id: string;
  label: string;
  type: EntryType;
  amount?: number;
  category?: Category;
};

function isTemplate(value: unknown): value is Template {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    (v.type === "expense" || v.type === "task")
  );
}

/**
 * Loads and persists saved entry templates ("Rent", "Netflix", ...) used
 * as one-tap prefill shortcuts in QuickAddForm. Stored on auth
 * user_metadata (same place display_name/currency_format/budgets already
 * live) as a plain array — templates are a short, per-user list (a
 * handful of recurring bills, not unbounded data), so this doesn't
 * warrant its own Supabase table + RLS policy the way `categories` did.
 */
export function useTemplates() {
  const [templates, setTemplatesState] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      // Same session-hydration guard used by every other hook here — avoids
      // reading a stale/absent user right after a hard-navigation login.
      await supabase.auth.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      const stored = user?.user_metadata?.recurring_templates;
      if (Array.isArray(stored)) {
        setTemplatesState(stored.filter(isTemplate));
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Template[]) => {
    setTemplatesState(next); // optimistic
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { recurring_templates: next } });
  }, []);

  // Upserts by (label, type) case-insensitively — saving "Netflix" again
  // with a new price updates the existing template in place rather than
  // creating a duplicate chip, since a changed subscription price is the
  // most common reason to re-save the same recurring entry.
  const addTemplate = useCallback(
    (input: {
      label: string;
      type: EntryType;
      amount?: number;
      category?: Category;
    }) => {
      const trimmedLabel = input.label.trim();
      if (!trimmedLabel) return;

      const existingIndex = templates.findIndex(
        (t) =>
          t.type === input.type &&
          t.label.toLowerCase() === trimmedLabel.toLowerCase(),
      );

      const template: Template = {
        id: existingIndex >= 0 ? templates[existingIndex].id : crypto.randomUUID(),
        label: trimmedLabel,
        type: input.type,
        ...(input.type === "expense"
          ? { amount: input.amount, category: input.category }
          : {}),
      };

      const next =
        existingIndex >= 0
          ? templates.map((t, i) => (i === existingIndex ? template : t))
          : [...templates, template];

      persist(next);
    },
    [templates, persist],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      persist(templates.filter((t) => t.id !== id));
    },
    [templates, persist],
  );

  return { templates, addTemplate, deleteTemplate, loading };
}
