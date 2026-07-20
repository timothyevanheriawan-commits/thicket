"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  enqueueOfflineEntry,
  getOfflineQueue,
  removeFromOfflineQueue,
  type QueuedEntry,
} from "@/lib/offlineQueue";

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
  // True for an entry that only exists in the local offline queue —
  // never synced to Supabase yet. `id` for a pending entry is the same
  // `localId` used to track it in the queue, since it has no server row.
  pending?: boolean;
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

function queuedToEntry(item: QueuedEntry): Entry {
  return {
    id: item.localId,
    type: item.input.type,
    label: item.input.label,
    amount: item.input.amount,
    category: item.input.category as Category | undefined,
    done: item.input.type === "task" ? false : undefined,
    createdAt: new Date(item.createdAt),
    dueDate: item.input.dueDate ? new Date(item.input.dueDate) : undefined,
    pending: true,
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

  // Retries every entry currently sitting in the local offline queue.
  // Runs once on mount (after the initial load effect above has had a
  // chance to seed the feed) and again on every browser 'online' event.
  // Stops at the first failure in a pass rather than trying every
  // remaining item — if one insert fails because the connection is still
  // down, the rest will fail identically, so there's no point burning
  // more failed requests; the next 'online' event will retry the whole
  // queue anyway.
  const flushOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    for (const item of queue) {
      try {
        const { data, error } = await supabase
          .from("entries")
          .insert({
            user_id: user.id,
            type: item.input.type,
            label: item.input.label,
            amount: item.input.amount ?? null,
            category: item.input.category ?? null,
            done: item.input.type === "task" ? false : null,
            due_date: item.input.dueDate ?? null,
          })
          .select()
          .single();

        if (error || !data) {
          // A genuine (non-network) rejection — e.g. the row now fails a
          // constraint. Drop it from the queue rather than retrying
          // forever, but surface the error instead of silently losing it.
          removeFromOfflineQueue(item.localId);
          setEntries((prev) => prev.filter((e) => e.id !== item.localId));
          setError(error?.message ?? "Failed to sync an offline entry");
          continue;
        }

        const finalEntry = rowToEntry(data as EntryRow);
        removeFromOfflineQueue(item.localId);
        setEntries((prev) =>
          prev.map((e) => (e.id === item.localId ? finalEntry : e)),
        );
      } catch {
        // Thrown, not returned — almost always still offline. Leave the
        // rest of the queue untouched for the next 'online' event.
        break;
      }
    }
  }, []);

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

      // Anything still sitting in the offline queue from a previous
      // session (page reload while offline, browser closed before
      // reconnecting) needs to show up in the feed immediately — the
      // person shouldn't have to wonder if what they typed offline
      // actually "took". flushQueue (below) will attempt to sync these
      // once this initial load finishes.
      const queuedEntries = getOfflineQueue().map(queuedToEntry);

      if (error) {
        setError(error.message);
        setEntries(queuedEntries);
      } else {
        setEntries([...queuedEntries, ...(data as EntryRow[]).map(rowToEntry)]);
        setError(null);
      }
      setLoading(false);

      // Attempt to sync anything left over from a previous offline
      // session now that the feed has been seeded — deliberately called
      // from inside this same async function (not a separate effect
      // reacting to a `loading` dependency) so the entries state update
      // above has already landed before flushOfflineQueue's own state
      // updates try to match against it.
      flushOfflineQueue();
    }

    load();
    return () => {
      cancelled = true;
    };
    // flushOfflineQueue is stable (empty dep array below) for the
    // lifetime of this hook instance, so omitting it here doesn't risk a
    // stale closure — including it would just re-run this mount effect
    // on every render for no benefit, since useCallback identity is the
    // only thing that could change it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    window.addEventListener("online", flushOfflineQueue);
    return () => window.removeEventListener("online", flushOfflineQueue);
  }, [flushOfflineQueue]);

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
      const optimisticEntry: Entry = {
        id: optimisticId,
        type: input.type,
        label: input.label,
        amount: input.amount,
        category: input.category,
        done: input.type === "task" ? false : undefined,
        createdAt: new Date(),
        dueDate: input.type === "task" ? input.dueDate : undefined,
      };

      const queuedItem: QueuedEntry = {
        localId: optimisticId,
        input: {
          type: input.type,
          label: input.label,
          amount: input.amount,
          category: input.category,
          dueDate:
            input.type === "task" && input.dueDate
              ? input.dueDate.toISOString()
              : undefined,
        },
        createdAt: optimisticEntry.createdAt.toISOString(),
      };

      // Proactively offline: skip the network attempt entirely rather
      // than waiting for a fetch to fail. Queue immediately so the entry
      // survives a reload even if the person closes the tab before
      // reconnecting.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setEntries((prev) => [{ ...optimisticEntry, pending: true }, ...prev]);
        enqueueOfflineEntry(queuedItem);
        return optimisticEntry;
      }

      setEntries((prev) => [optimisticEntry, ...prev]);

      try {
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
      } catch {
        // The insert call itself threw rather than returning an error —
        // this is what a mid-request connection drop looks like (fetch
        // rejects), as opposed to a server-side rejection (which comes
        // back as `error` above). Treat it the same as the proactive
        // offline path: queue it instead of discarding what was typed.
        setEntries((prev) =>
          prev.map((e) =>
            e.id === optimisticId ? { ...e, pending: true } : e,
          ),
        );
        enqueueOfflineEntry(queuedItem);
        return optimisticEntry;
      }
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
