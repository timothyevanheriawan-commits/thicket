"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import EntryRow from "@/components/EntryRow";
import LeafTrio from "@/components/icons/LeafTrio";
import { useToast } from "@/components/Toast";
import { toLocalISODate } from "@/lib/dateUtils";
import {
  formatDayLabel,
  formatIDR,
  isThisWeek,
  type CurrencyFormat,
} from "@/lib/format";
import {
  DELETE_GRACE_PERIOD_MS,
  type Category,
  type Entry,
  type EntryType,
} from "@/lib/hooks/useEntries";

type EntryFeedProps = {
  entries: Entry[];
  categories: Category[];
  justAddedId: string | null;
  currencyFormat?: CurrencyFormat;
  onToggleTask: (id: string) => void;
  onTogglePin: (id: string) => void;
  onEditEntry: (
    id: string,
    updates: { label: string; amount?: number; dueDate?: Date | null },
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onUndoDelete: (id: string) => void;
  onDuplicate: (entry: Entry) => void;
  onSaveAsTemplate: (entry: Entry) => void;
};

export default function EntryFeed({
  entries,
  categories,
  justAddedId,
  currencyFormat,
  onToggleTask,
  onTogglePin,
  onEditEntry,
  onDeleteEntry,
  onUndoDelete,
  onDuplicate,
  onSaveAsTemplate,
}: EntryFeedProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | EntryType>("all");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOlder, setShowOlder] = useState(false);

  const isSearching = searchQuery.trim() !== "";

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (
        filterType === "expense" &&
        filterCategory !== "all" &&
        e.category !== filterCategory
      )
        return false;
      if (q && !e.label.toLowerCase().includes(q)) return false;
      // Completed tasks are hidden by default to keep the feed from
      // filling up with strikethrough clutter — but an active search
      // bypasses this, since deliberately looking for something should
      // always be able to find it regardless of done state.
      if (!showCompleted && !isSearching && e.type === "task" && e.done)
        return false;
      return true;
    });
  }, [
    entries,
    searchQuery,
    filterType,
    filterCategory,
    showCompleted,
    isSearching,
  ]);

  // Total completed-task count is filter-independent (category filtering
  // never applies to tasks, since filterCategory always resets to "all"
  // once filterType leaves "expense"), so this doesn't need to track
  // filterType/filterCategory itself.
  const completedTaskCount = useMemo(
    () => entries.filter((e) => e.type === "task" && e.done).length,
    [entries],
  );

  const groupedEntries = useMemo(() => {
    const groups: { label: string; entries: Entry[] }[] = [];
    filteredEntries.forEach((entry) => {
      const label = formatDayLabel(entry.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.entries.push(entry);
      } else {
        groups.push({ label, entries: [entry] });
      }
    });
    return groups;
  }, [filteredEntries]);

  // Groups older than the rolling 7-day window are collapsed behind a
  // toggle by default — a long-lived feed otherwise just keeps stacking
  // day headers forever. formatDayLabel already applies this same
  // isThisWeek boundary to decide "Monday" vs. "12 Jul" formatting, so
  // reusing it here keeps the recent/older split consistent with what
  // the labels themselves already imply.
  const { recentGroups, olderGroups } = useMemo(() => {
    const recent: typeof groupedEntries = [];
    const older: typeof groupedEntries = [];
    groupedEntries.forEach((group) => {
      const representativeDate = group.entries[0]?.createdAt;
      if (representativeDate && !isThisWeek(representativeDate)) {
        older.push(group);
      } else {
        recent.push(group);
      }
    });
    return { recentGroups: recent, olderGroups: older };
  }, [groupedEntries]);

  const olderEntryCount = useMemo(
    () => olderGroups.reduce((sum, g) => sum + g.entries.length, 0),
    [olderGroups],
  );

  // Same reasoning as the completed-task filter above: an active search
  // should never be hidden behind a collapsed section.
  const effectiveShowOlder = showOlder || isSearching;

  const hasActiveFilter =
    searchQuery.trim() !== "" ||
    filterType !== "all" ||
    filterCategory !== "all";

  function clearFilters() {
    setSearchQuery("");
    setFilterType("all");
    setFilterCategory("all");
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    setEditAmount(entry.amount !== undefined ? String(entry.amount) : "");
    setEditDueDate(entry.dueDate ? toLocalISODate(entry.dueDate) : "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editLabel.trim()) return;
    await onEditEntry(id, {
      label: editLabel.trim(),
      amount: Number(editAmount) || 0,
      dueDate: editDueDate ? new Date(`${editDueDate}T00:00:00`) : null,
    });
    setEditingId(null);
  }

  async function triggerDelete(entry: Entry) {
    await onDeleteEntry(entry.id);
    toast(`"${entry.label}" deleted`, {
      duration: DELETE_GRACE_PERIOD_MS,
      action: {
        label: "Undo",
        onClick: () => onUndoDelete(entry.id),
      },
    });
  }

  function renderGroup(
    group: { label: string; entries: Entry[] },
    key: string,
  ) {
    // A day's real spend, surfaced right on the divider — the one
    // structural device in the feed that encodes actual data instead of
    // just labeling the date. Undefined (not zero) when the group has no
    // expenses, so a task-only day doesn't show a misleading "Rp 0".
    const dayTotal = group.entries.reduce<number | undefined>(
      (sum, e) => (e.type === "expense" ? (sum ?? 0) + (e.amount ?? 0) : sum),
      undefined,
    );

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 border-b border-brown/10 px-1 pb-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brown/40">
            {group.label}
          </p>
          {dayTotal !== undefined && (
            <p className="text-[11px] font-medium text-brown/35">
              {formatIDR(dayTotal, currencyFormat)}
            </p>
          )}
        </div>
        <AnimatePresence initial={false}>
          {group.entries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 30,
              }}
            >
              <EntryRow
                entry={entry}
                currencyFormat={currencyFormat}
                isEditing={editingId === entry.id}
                isConfirmingDelete={confirmDeleteId === entry.id}
                isJustAdded={entry.id === justAddedId}
                editLabel={editLabel}
                editAmount={editAmount}
                editDueDate={editDueDate}
                onEditLabelChange={setEditLabel}
                onEditAmountChange={setEditAmount}
                onEditDueDateChange={setEditDueDate}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => saveEdit(entry.id)}
                onStartEdit={() => startEdit(entry)}
                onStartDelete={() => setConfirmDeleteId(entry.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => {
                  setConfirmDeleteId(null);
                  triggerDelete(entry);
                }}
                onToggleTask={() => onToggleTask(entry.id)}
                onTogglePin={() => onTogglePin(entry.id)}
                onDuplicate={() => onDuplicate(entry)}
                onSaveAsTemplate={() => onSaveAsTemplate(entry)}
                onSwipeDelete={() => triggerDelete(entry)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {entries.length === 0 ? (
        <motion.div
          key="empty-total"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="rounded-[var(--radius-soft)] bg-surface/40 px-4 py-12 text-center"
        >
          <LeafTrio size={40} className="mx-auto mb-3" />
          <p className="font-display text-sm text-brown/60">
            Nothing captured yet.
          </p>
          <p className="mt-1 text-xs text-brown/40">
            Add your first expense or task above — small things count too.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="flex flex-col gap-3"
        >
          <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 bg-bg/95 px-1 py-2 backdrop-blur-sm">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brown/30"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="w-full rounded-lg border-none bg-surface px-3 py-2 pl-8 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "expense", "task"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setFilterType(t);
                    if (t !== "expense") setFilterCategory("all");
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterType === t
                      ? "bg-sage-deep text-bg"
                      : "bg-surface text-brown/60"
                  }`}
                >
                  {t === "all" ? "All" : t === "expense" ? "Expense" : "Task"}
                </button>
              ))}
              {filterType !== "expense" && completedTaskCount > 0 && (
                <button
                  onClick={() => setShowCompleted((prev) => !prev)}
                  className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    showCompleted
                      ? "bg-sage-deep text-bg"
                      : "bg-surface text-brown/50"
                  }`}
                >
                  {showCompleted
                    ? "Hide completed"
                    : `Show completed (${completedTaskCount})`}
                </button>
              )}
            </div>

            <AnimatePresence>
              {filterType === "expense" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="flex flex-wrap gap-1.5"
                >
                  <button
                    onClick={() => setFilterCategory("all")}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      filterCategory === "all"
                        ? "bg-clay text-bg"
                        : "bg-surface text-brown/60"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        filterCategory === c
                          ? "bg-clay text-bg"
                          : "bg-surface text-brown/60"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {filteredEntries.length === 0 ? (
              <motion.div
                key="empty-filtered"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="rounded-[var(--radius-soft)] bg-surface/40 px-4 py-12 text-center"
              >
                <Search size={28} className="mx-auto mb-3 text-brown/25" />
                <p className="font-display text-sm text-brown/50">
                  No entries match your search.
                </p>
                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-xs font-medium text-sage-deep underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="flex flex-col gap-4"
              >
                {recentGroups.map((group, i) =>
                  renderGroup(group, `recent-${group.label}-${i}`),
                )}

                {olderGroups.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {!isSearching && (
                      <button
                        onClick={() => setShowOlder((prev) => !prev)}
                        className="mx-1 self-start rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-brown/50 transition-colors hover:bg-surface/70 hover:text-brown/70"
                      >
                        {showOlder
                          ? "Hide older entries"
                          : `Show older entries (${olderEntryCount})`}
                      </button>
                    )}
                    <AnimatePresence initial={false}>
                      {effectiveShowOlder && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 30,
                          }}
                          className="flex flex-col gap-4 overflow-hidden"
                        >
                          {olderGroups.map((group, i) =>
                            renderGroup(group, `older-${group.label}-${i}`),
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
