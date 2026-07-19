"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrencyFormat } from "@/lib/format";

const DEFAULT_FORMAT: CurrencyFormat = "standard";

function isCurrencyFormat(value: unknown): value is CurrencyFormat {
  return value === "standard" || value === "comma" || value === "compact";
}

/**
 * Loads and persists the user's currency display preference. Stored on
 * auth user_metadata (same place display_name already lives in Settings)
 * rather than a new table/column — one small preference doesn't warrant a
 * schema change.
 */
export function useCurrencyFormat() {
  const [format, setFormatState] = useState<CurrencyFormat>(DEFAULT_FORMAT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      // Same session-hydration guard as useEntries/useCategories — avoids
      // reading a stale/absent user right after a hard-navigation login.
      await supabase.auth.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      const stored = user?.user_metadata?.currency_format;
      if (isCurrencyFormat(stored)) {
        setFormatState(stored);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFormat = useCallback(async (next: CurrencyFormat) => {
    setFormatState(next); // optimistic — Settings' own save state covers errors
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { currency_format: next } });
  }, []);

  return { format, setFormat, loading };
}
