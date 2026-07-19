"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Grace period before a deleted entry is actually removed from Supabase.
// Undo is only possible within this window. Keep this in sync with the
// duration of the "Undo" toast shown by the caller (e.g. EntryFeed) so the
// undo action disappears from the UI at roughly the same time it stops
// working.
export const DELETE_GRACE_PERIOD_MS = 5000;

export type EntryType = "expense" | "task";
export type Category =
  | "Food"
  | "Shopping"
  | "Transport"
  | "Savings"
  | "Entertainment"
  | "Bills";

export type Entry = {
  id: string;
  type: EntryType;
  label: string;
  amount?: number;
  category?: Category;
  done?: boolean;
  createdAt: Date;
  dueDate?: Date;
  pinned?: boolean;
};

type EntryRow = {
  id: string;
  type: EntryType;
  label: string;
  amount: number | null;
  category: Category | null;
  done: boolean | null;
  created_at: string;
  due_date: string | null;
  pinned: boolean | null;
};

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    amount: row.amount ?? undefined,
    category: row.category ?? undefined,
    done: row.done ?? undefined,
    createdAt: new Date(row.created_at),
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    pinned: row.pinned ?? false,
  };
}

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entries that have been optimistically removed from the feed but whose
  // actual Supabase deletion is still pending (grace period for undo).
  // Kept in a ref, not state, since it's write-only bookkeeping — it never
  // needs to trigger a re-render on its own.
  const pendingDeletesRef = useRef<
    Map<
      string,
      { entry: Entry; index: number; timeoutId: ReturnType<typeof setTimeout> }
    >
  >(new Map());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Wait for the browser client's own session hydration to finish
      // before querying. middleware.ts validates the session server-side
      // to allow this page to render at all, but createBrowserClient does
      // its own separate, async read of the session from cookies on the
      // client. Right after a hard-navigation login, this effect can fire
      // before that finishes — the query then goes out effectively
      // unauthenticated, RLS silently returns zero rows (no error), and
      // the feed looks empty until a manual refresh. getSession() awaits
      // that same internal hydration without an extra network round trip.
      await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        setEntries((data as EntryRow[]).map(rowToEntry));
        setError(null);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addEntry = useCallback(
    async (input: {
      type: EntryType;
      label: string;
      amount?: number;
      category?: Category;
      dueDate?: Date;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const optimisticId = crypto.randomUUID();
      setEntries((prev) => [
        {
          id: optimisticId,
          type: input.type,
          label: input.label,
          amount: input.amount,
          category: input.category,
          done: input.type === "task" ? false : undefined,
          createdAt: new Date(),
          dueDate: input.type === "task" ? input.dueDate : undefined,
        },
        ...prev,
      ]);

      const { data, error } = await supabase
        .from("entries")
        .insert({
          user_id: user.id,
          type: input.type,
          label: input.label,
          amount: input.amount ?? null,
          category: input.category ?? null,
          done: input.type === "task" ? false : null,
          due_date:
            input.type === "task" && input.dueDate
              ? input.dueDate.toISOString()
              : null,
        })
        .select()
        .single();

      if (error || !data) {
        setEntries((prev) => prev.filter((e) => e.id !== optimisticId));
        setError(error?.message ?? "Failed to add entry");
        return null;
      }

      const finalEntry = rowToEntry(data as EntryRow);
      setEntries((prev) =>
        prev.map((e) => (e.id === optimisticId ? finalEntry : e)),
      );
      return finalEntry;
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const toggleTask = useCallback(async (id: string) => {
    const supabase = createClient();
    let previousDone: boolean | undefined;

    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          previousDone = e.done;
          return { ...e, done: !e.done };
        }
        return e;
      }),
    );

    const { error } = await supabase
      .from("entries")
      .update({ done: !previousDone })
      .eq("id", id);

    if (error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, done: previousDone } : e)),
      );
      setError(error.message);
    }
  }, []);

  const togglePin = useCallback(async (id: string) => {
    const supabase = createClient();
    let previousPinned: boolean | undefined;

    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          previousPinned = e.pinned;
          return { ...e, pinned: !e.pinned };
        }
        return e;
      }),
    );

    const { error } = await supabase
      .from("entries")
      .update({ pinned: !previousPinned })
      .eq("id", id);

    if (error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, pinned: previousPinned } : e)),
      );
      setError(error.message);
    }
  }, []);

  const editEntry = useCallback(
    async (
      id: string,
      updates: { label: string; amount?: number; dueDate?: Date | null },
    ) => {
      const supabase = createClient();
      let previous: Entry | undefined;

      setEntries((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            previous = e;
            return {
              ...e,
              label: updates.label,
              ...(e.type === "expense" ? { amount: updates.amount } : {}),
              ...(e.type === "task"
                ? { dueDate: updates.dueDate ?? undefined }
                : {}),
            };
          }
          return e;
        }),
      );

      const { error } = await supabase
        .from("entries")
        .update({
          label: updates.label,
          ...(previous?.type === "expense"
            ? { amount: updates.amount ?? 0 }
            : {}),
          ...(previous?.type === "task"
            ? {
                due_date: updates.dueDate
                  ? updates.dueDate.toISOString()
                  : null,
              }
            : {}),
        })
        .eq("id", id);

      if (error && previous) {
        const fallback = previous;
        setEntries((prev) => prev.map((e) => (e.id === id ? fallback : e)));
        setError(error.message);
      }
    },
    [],
  );

  // Optimistically removes the entry from the feed immediately, but delays
  // the actual Supabase delete by DELETE_GRACE_PERIOD_MS so the caller can
  // offer an "Undo" action (see undoDelete below). If a previous pending
  // delete exists for this id (shouldn't normally happen), it's cleared
  // first so timers can't leak or double-fire.
  const deleteEntry = useCallback(async (id: string) => {
    const supabase = createClient();

    const existingPending = pendingDeletesRef.current.get(id);
    if (existingPending) {
      clearTimeout(existingPending.timeoutId);
      pendingDeletesRef.current.delete(id);
    }

    let removed: Entry | undefined;
    let removedIndex = -1;

    setEntries((prev) => {
      removedIndex = prev.findIndex((e) => e.id === id);
      removed = prev[removedIndex];
      return prev.filter((e) => e.id !== id);
    });

    if (!removed) return;

    const toRemove = removed;
    const insertAt = removedIndex;

    // Deliberately not cleared on unmount: the deletion must still happen
    // in the background even if the user navigates away mid-grace-period,
    // otherwise the entry would silently come back on next load.
    const timeoutId = setTimeout(async () => {
      pendingDeletesRef.current.delete(id);
      const { error } = await supabase.from("entries").delete().eq("id", id);

      if (error) {
        // The undo window already closed by the time this failed, so
        // restoring the entry (rather than losing it silently) and
        // surfacing the error is the safer default.
        setEntries((prev) => {
          const next = [...prev];
          next.splice(insertAt, 0, toRemove);
          return next;
        });
        setError(error.message);
      }
    }, DELETE_GRACE_PERIOD_MS);

    pendingDeletesRef.current.set(id, {
      entry: toRemove,
      index: insertAt,
      timeoutId,
    });
  }, []);

  // Cancels a pending delete (within its grace period) and restores the
  // entry to its original position. No Supabase call needed here, since
  // the actual delete request was never sent.
  const undoDelete = useCallback((id: string) => {
    const pending = pendingDeletesRef.current.get(id);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingDeletesRef.current.delete(id);

    setEntries((prev) => {
      const next = [...prev];
      const insertAt = Math.min(pending.index, next.length);
      next.splice(insertAt, 0, pending.entry);
      return next;
    });
  }, []);

  return {
    entries,
    loading,
    error,
    addEntry,
    toggleTask,
    togglePin,
    editEntry,
    deleteEntry,
    undoDelete,
    clearError,
  };
}
