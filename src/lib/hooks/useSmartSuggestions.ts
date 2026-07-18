"use client";

import { useMemo } from "react";
import Fuse from "fuse.js";
import type { Category, Entry, EntryType } from "@/lib/hooks/useEntries";

export type Suggestion = {
  label: string;
  /** Present for expense suggestions only — tasks have no category. */
  category?: Category;
};

const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 3;

type Candidate = {
  label: string;
  category?: Category;
  createdAt: Date;
};

/**
 * Fuzzy-matches the current quick-add label against past entries of the
 * same type and returns up to MAX_SUGGESTIONS candidates.
 * - For "expense": only entries that had a category are eligible, and the
 *   suggestion carries that category (used to autocomplete the category chip).
 * - For "task": any past task label is eligible, no category involved
 *   (used to autocomplete the label text itself).
 * Deduplicates by lowercased label, keeping the most recent occurrence.
 */
export function useSmartSuggestions(
  entries: Entry[],
  query: string,
  type: EntryType,
): Suggestion[] {
  const candidates = useMemo(() => {
    const byLabel = new Map<string, Candidate>();

    for (const entry of entries) {
      if (entry.type !== type) continue;
      if (type === "expense" && !entry.category) continue;
      const trimmedLabel = entry.label.trim();
      if (!trimmedLabel) continue;

      const key = trimmedLabel.toLowerCase();
      const existing = byLabel.get(key);
      if (!existing || entry.createdAt > existing.createdAt) {
        byLabel.set(key, {
          label: trimmedLabel,
          category: entry.category,
          createdAt: entry.createdAt,
        });
      }
    }

    return Array.from(byLabel.values());
  }, [entries, type]);

  const fuse = useMemo(
    () =>
      new Fuse(candidates, {
        keys: ["label"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [candidates],
  );

  return useMemo(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) return [];

    return fuse
      .search(trimmedQuery)
      .slice(0, MAX_SUGGESTIONS)
      .map((result) => ({
        label: result.item.label,
        ...(result.item.category ? { category: result.item.category } : {}),
      }));
  }, [fuse, query]);
}
