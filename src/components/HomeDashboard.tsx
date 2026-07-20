"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { X, Settings as SettingsIcon, ArrowUp, ArrowDown } from "lucide-react";
import CategoryChart from "@/components/CategoryChart";
import TaskWidget from "@/components/TaskWidget";
import QuickAddForm from "@/components/QuickAddForm";
import QuickAddFab from "@/components/QuickAddFab";
import EntryFeed from "@/components/EntryFeed";
import {
  formatIDR,
  formatDueLabel,
  isThisWeek,
  isLastWeek,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { useCategories } from "@/lib/hooks/useCategories";
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat";
import { useBudgets } from "@/lib/hooks/useBudgets";
import { useTemplates, type Template } from "@/lib/hooks/useTemplates";
import {
  useEntries,
  type Category,
  type Entry,
  type EntryType,
} from "@/lib/hooks/useEntries";

export default function HomeDashboard() {
  const {
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
  } = useEntries();

  const {
    customCategories,
    allCategories,
    addCategory,
    deleteCategory,
    error: categoryError,
    clearError: clearCategoryError,
  } = useCategories();

  const { format: currencyFormat } = useCurrencyFormat();
  const { weeklyBudget, categoryBudgets } = useBudgets();
  const { templates, addTemplate } = useTemplates();

  const [type, setType] = useState<EntryType>("expense");
  const [category, setCategory] = useState<Category>("Food");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // --- Task deadline (quick-add form) ---
  const [taskDueDate, setTaskDueDate] = useState(""); // ISO yyyy-mm-dd, "" = none

  // --- Display name for the header greeting ---
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const name = data?.user?.user_metadata?.display_name;
      if (typeof name === "string" && name.trim() !== "") {
        setDisplayName(name);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => clearError(), 5000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  useEffect(() => {
    if (!categoryError) return;
    const timer = setTimeout(() => clearCategoryError(), 5000);
    return () => clearTimeout(timer);
  }, [categoryError, clearCategoryError]);

  useEffect(() => {
    if (!justAddedId) return;
    // Matches the leaf-settle animation duration (260ms) plus a small buffer.
    const timer = setTimeout(() => setJustAddedId(null), 350);
    return () => clearTimeout(timer);
  }, [justAddedId]);

  const weeklyTotal = useMemo(() => {
    return entries
      .filter(
        (e) => e.type === "expense" && e.amount && isThisWeek(e.createdAt),
      )
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  }, [entries]);

  const lastWeekTotal = useMemo(() => {
    return entries
      .filter(
        (e) => e.type === "expense" && e.amount && isLastWeek(e.createdAt),
      )
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  }, [entries]);

  // Percent change vs. last week. Only meaningful when last week actually
  // had spend to compare against — with lastWeekTotal at 0, any percentage
  // would be either undefined (0/0) or a misleading "Infinity%" (n/0), so
  // the delta is simply not shown in that case rather than faked.
  const weeklyDeltaPercent =
    lastWeekTotal > 0
      ? Math.round(((weeklyTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : null;

  // Count-up animation for the header total: a MotionValue is bound
  // directly as the child of a motion.span below, so Framer Motion updates
  // the text content imperatively on every animation frame without
  // triggering a React re-render. Standard 420/30 spring preset, same as
  // everywhere else in the app.
  // Soft budget nudge: only meaningful once a weekly budget is actually
  // set. Progress is clamped for the bar's width, but the raw (unclamped)
  // percent is what actually decides the over-budget color, so a bar that
  // visually looks "full" at 100% still correctly flags anything past it.
  const weeklyBudgetPercent =
    weeklyBudget !== null && weeklyBudget > 0
      ? (weeklyTotal / weeklyBudget) * 100
      : null;
  const isOverWeeklyBudget =
    weeklyBudgetPercent !== null && weeklyBudgetPercent > 100;

  const weeklyTotalMotion = useMotionValue(0);
  const weeklyTotalDisplay = useTransform(weeklyTotalMotion, (v) =>
    formatIDR(Math.round(v), currencyFormat),
  );

  useEffect(() => {
    const controls = animate(weeklyTotalMotion, weeklyTotal, {
      type: "spring",
      stiffness: 420,
      damping: 30,
    });
    return controls.stop;
  }, [weeklyTotal, weeklyTotalMotion]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<Category, number>();
    entries.forEach((e) => {
      if (
        e.type === "expense" &&
        e.category &&
        e.amount &&
        isThisWeek(e.createdAt)
      ) {
        totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
      }
    });
    return allCategories
      .filter((c) => totals.has(c))
      .map((c) => ({
        category: c,
        total: totals.get(c) ?? 0,
      }));
  }, [entries, allCategories]);

  const taskWidgetItems = useMemo(() => {
    const openTasks = entries.filter((e) => e.type === "task" && !e.done);
    const rank = (e: (typeof openTasks)[number]) => {
      if (e.pinned) return 0;
      if (e.dueDate && formatDueLabel(e.dueDate).overdue) return 1;
      return 2;
    };
    return [...openTasks]
      .sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (a.dueDate && b.dueDate)
          return a.dueDate.getTime() - b.dueDate.getTime();
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice(0, 5);
  }, [entries]);

  const isAmountInvalid =
    type === "expense" && amount.trim() !== "" && Number.isNaN(Number(amount));
  const canSubmit = label.trim() !== "" && !isAmountInvalid;

  async function handleAdd() {
    if (!canSubmit) return;
    const newEntry = await addEntry({
      type,
      label: label.trim(),
      ...(type === "expense" ? { amount: Number(amount) || 0, category } : {}),
      ...(type === "task" && taskDueDate
        ? { dueDate: new Date(`${taskDueDate}T00:00:00`) }
        : {}),
    });
    if (newEntry) {
      setIsAddOpen(false);
      setJustAddedId(newEntry.id);
    }
    setLabel("");
    setAmount("");
    setTaskDueDate("");
  }

  function duplicateToForm(entry: Entry) {
    setType(entry.type);
    setLabel(entry.label);
    if (entry.type === "expense") {
      setAmount(entry.amount !== undefined ? String(entry.amount) : "");
      if (entry.category) setCategory(entry.category);
    } else {
      setAmount("");
    }
    // Open the mobile FAB bottom sheet so the prefilled form is actually
    // visible (on desktop the inline form is always shown, so this is a no-op).
    setIsAddOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveEntryAsTemplate(entry: Entry) {
    addTemplate({
      label: entry.label,
      type: entry.type,
      amount: entry.amount,
      category: entry.category,
    });
  }

  // Prefills the form from a saved template — same "fill, don't submit"
  // behavior as duplicateToForm, so the amount can still be double-checked
  // (a subscription price can drift) before it actually gets logged.
  function selectTemplate(template: Template) {
    setType(template.type);
    setLabel(template.label);
    if (template.type === "expense") {
      setAmount(template.amount !== undefined ? String(template.amount) : "");
      if (template.category) setCategory(template.category);
    } else {
      setAmount("");
    }
    setIsAddOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-24 pt-8">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          {displayName && (
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-brown/40">
              Welcome back, {displayName}
            </p>
          )}
          <h1 className="relative inline-block font-display text-3xl font-medium italic tracking-tight text-sage-deep">
            Thicket
            <svg
              viewBox="0 0 90 10"
              className="absolute -bottom-2 left-0 h-2.5 w-[90%]"
              aria-hidden="true"
            >
              <path
                d="M2 6 C 20 2, 35 9, 50 5 S 78 2, 88 6"
                fill="none"
                stroke="var(--clay)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p className="mt-3.5 flex items-center gap-1.5 text-sm text-brown/60">
            <span>
              This week &middot;{" "}
              <motion.span
                className={
                  isOverWeeklyBudget ? "font-medium text-clay" : undefined
                }
              >
                {weeklyTotalDisplay}
              </motion.span>{" "}
              spent
            </span>
            {weeklyDeltaPercent !== null && weeklyDeltaPercent !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  weeklyDeltaPercent > 0 ? "text-clay" : "text-sage-deep"
                }`}
              >
                {weeklyDeltaPercent > 0 ? (
                  <ArrowUp size={11} strokeWidth={2.5} />
                ) : (
                  <ArrowDown size={11} strokeWidth={2.5} />
                )}
                {Math.abs(weeklyDeltaPercent)}%
              </span>
            )}
          </p>
          {weeklyBudgetPercent !== null && (
            <div
              className="mt-2.5 h-1 w-full max-w-40 overflow-hidden rounded-full bg-surface"
              role="progressbar"
              aria-label="Weekly budget progress"
              aria-valuenow={Math.round(Math.min(100, weeklyBudgetPercent))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className={`h-full rounded-full ${
                  isOverWeeklyBudget ? "bg-clay" : "bg-sage"
                }`}
                initial={false}
                animate={{ width: `${Math.min(100, weeklyBudgetPercent)}%` }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              />
            </div>
          )}
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="rounded-full p-2 text-brown/40 transition-colors hover:bg-surface hover:text-brown/70"
        >
          <SettingsIcon size={16} />
        </Link>
      </header>

      {[
        error && { message: error, onDismiss: clearError },
        categoryError && {
          message: categoryError,
          onDismiss: clearCategoryError,
        },
      ]
        .filter(
          (banner): banner is { message: string; onDismiss: () => void } =>
            Boolean(banner),
        )
        .map((banner, i) => (
          <div
            key={i}
            className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay"
          >
            <span>{banner.message}</span>
            <button
              onClick={banner.onDismiss}
              aria-label="Dismiss error"
              className="shrink-0 rounded-full p-1 hover:bg-clay/20"
            >
              <X size={12} />
            </button>
          </div>
        ))}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
          <div className="order-1 h-40 animate-pulse rounded-soft bg-surface/60 md:col-start-1 md:row-start-1" />
          <div className="order-2 h-48 animate-pulse rounded-soft bg-surface/60 md:col-start-2 md:row-start-1 md:row-span-3" />
          <div className="order-3 h-24 animate-pulse rounded-[var(--radius-soft)] bg-surface/60 md:col-start-1 md:row-start-2" />
          <div className="order-4 flex flex-col gap-1.5 md:col-start-1 md:row-start-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-surface/60"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px] md:items-start">
          {/* Quick add — inline on desktop; on mobile this is replaced by the FAB + sheet below */}
          <div className="order-1 hidden md:col-start-1 md:row-start-1 md:block">
            <QuickAddForm
              type={type}
              onTypeChange={setType}
              category={category}
              onCategoryChange={setCategory}
              categories={allCategories}
              customCategories={customCategories}
              onAddCategory={addCategory}
              onDeleteCategory={deleteCategory}
              label={label}
              onLabelChange={setLabel}
              amount={amount}
              onAmountChange={setAmount}
              taskDueDate={taskDueDate}
              onTaskDueDateChange={setTaskDueDate}
              isAmountInvalid={isAmountInvalid}
              canSubmit={canSubmit}
              onSubmit={handleAdd}
              entries={entries}
              templates={templates}
              onSelectTemplate={selectTemplate}
            />
          </div>

          {/* Chart */}
          <div className="order-2 md:col-start-2 md:row-start-1 md:row-span-3">
            <CategoryChart data={categoryTotals} budgets={categoryBudgets} />
          </div>

          {/* Task widget */}
          {entries.length > 0 && (
            <div className="order-3 md:col-start-1 md:row-start-2">
              <TaskWidget
                tasks={taskWidgetItems}
                onToggle={toggleTask}
                onTogglePin={togglePin}
              />
            </div>
          )}

          {/* Feed */}
          <div className="order-4 md:col-start-1 md:row-start-3">
            <EntryFeed
              entries={entries}
              categories={allCategories}
              justAddedId={justAddedId}
              currencyFormat={currencyFormat}
              onToggleTask={toggleTask}
              onTogglePin={togglePin}
              onEditEntry={editEntry}
              onDeleteEntry={deleteEntry}
              onUndoDelete={undoDelete}
              onDuplicate={duplicateToForm}
              onSaveAsTemplate={saveEntryAsTemplate}
            />
          </div>
        </div>
      )}

      {!loading && (
        <QuickAddFab
          isOpen={isAddOpen}
          onOpen={() => setIsAddOpen(true)}
          onClose={() => setIsAddOpen(false)}
        >
          <QuickAddForm
            type={type}
            onTypeChange={setType}
            category={category}
            onCategoryChange={setCategory}
            categories={allCategories}
            customCategories={customCategories}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            label={label}
            onLabelChange={setLabel}
            amount={amount}
            onAmountChange={setAmount}
            taskDueDate={taskDueDate}
            onTaskDueDateChange={setTaskDueDate}
            isAmountInvalid={isAmountInvalid}
            canSubmit={canSubmit}
            onSubmit={handleAdd}
            entries={entries}
            templates={templates}
            onSelectTemplate={selectTemplate}
            autoFocus
          />
        </QuickAddFab>
      )}
    </div>
  );
}
