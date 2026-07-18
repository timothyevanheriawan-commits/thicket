"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toLocalISODate } from "@/lib/dateUtils";
import {
  useSmartSuggestions,
  type Suggestion,
} from "@/lib/hooks/useSmartSuggestions";
import type { CustomCategory } from "@/lib/hooks/useCategories";
import type { Category, Entry, EntryType } from "@/lib/hooks/useEntries";

type QuickAddFormProps = {
  type: EntryType;
  onTypeChange: (type: EntryType) => void;
  category: Category;
  onCategoryChange: (category: Category) => void;
  categories: Category[];
  customCategories: CustomCategory[];
  onAddCategory: (name: string) => Promise<CustomCategory | null>;
  onDeleteCategory: (id: string) => Promise<void>;
  label: string;
  onLabelChange: (label: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  taskDueDate: string;
  onTaskDueDateChange: (date: string) => void;
  isAmountInvalid: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  entries: Entry[];
  autoFocus?: boolean;
};

export default function QuickAddForm({
  type,
  onTypeChange,
  category,
  onCategoryChange,
  categories,
  customCategories,
  onAddCategory,
  onDeleteCategory,
  label,
  onLabelChange,
  amount,
  onAmountChange,
  taskDueDate,
  onTaskDueDateChange,
  isAmountInvalid,
  canSubmit,
  onSubmit,
  entries,
  autoFocus = false,
}: QuickAddFormProps) {
  const [todayISO] = useState(() => toLocalISODate(new Date()));
  const [tomorrowISO] = useState(() =>
    toLocalISODate(new Date(Date.now() + 86400000)),
  );
  const [thisWeekISO] = useState(() =>
    toLocalISODate(new Date(Date.now() + 7 * 86400000)),
  );

  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestions = useSmartSuggestions(entries, label, type);
  const showDropdown = showSuggestions && suggestions.length > 0;

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const skipNextCategoryBlurSubmit = useRef(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  function handleNewCategoryKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // submit happens in onBlur, single source of truth
    } else if (e.key === "Escape") {
      skipNextCategoryBlurSubmit.current = true;
      e.currentTarget.blur();
    }
  }

  function handleNewCategoryBlur() {
    const trimmed = newCategoryName.trim();
    const skip = skipNextCategoryBlurSubmit.current;
    skipNextCategoryBlurSubmit.current = false;
    setIsAddingCategory(false);
    setNewCategoryName("");

    if (skip || !trimmed) return;

    onAddCategory(trimmed).then((created) => {
      if (created) onCategoryChange(created.name);
    });
  }

  async function handleConfirmDeleteCategory(id: string) {
    await onDeleteCategory(id);
    setDeletingCategoryId(null);
  }

  function handleLabelFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setShowSuggestions(true);
  }

  function handleLabelBlur() {
    // Delay hiding so a click on a suggestion registers before the dropdown unmounts.
    blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 120);
  }

  function selectSuggestion(suggestion: Suggestion) {
    if (suggestion.category) {
      // Expense: autocomplete the category, leave the typed label as-is.
      onCategoryChange(suggestion.category);
    } else {
      // Task: no category to fill, so autocomplete the label text itself.
      onLabelChange(suggestion.label);
    }
    setShowSuggestions(false);
  }

  return (
    <div className="rounded-[var(--radius-soft)] bg-surface p-4 shadow-sm">
      <div className="mb-2.5 flex gap-2">
        <button
          onClick={() => onTypeChange("expense")}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            type === "expense" ? "bg-sage text-bg" : "bg-bg text-brown/60"
          }`}
        >
          Expense
        </button>
        <button
          onClick={() => onTypeChange("task")}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            type === "task" ? "bg-sage text-bg" : "bg-bg text-brown/60"
          }`}
        >
          Task
        </button>
      </div>

      <div className="relative">
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          onFocus={handleLabelFocus}
          onBlur={handleLabelBlur}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="category-suggestions"
          placeholder={
            type === "expense"
              ? "Lunch, grab, rent..."
              : "Call mom, submit report..."
          }
          className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
        />

        <AnimatePresence>
          {showDropdown && (
            <motion.ul
              id="category-suggestions"
              role="listbox"
              aria-label="Category suggestions"
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg bg-surface shadow-md ring-1 ring-brown/10"
            >
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.label}-${suggestion.category ?? "task"}`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={
                      suggestion.category
                        ? category === suggestion.category
                        : label === suggestion.label
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-brown transition-colors hover:bg-bg"
                  >
                    <span className="truncate text-brown/80">
                      {suggestion.label}
                    </span>
                    {suggestion.category && (
                      <span className="shrink-0 rounded-full bg-clay/10 px-2 py-0.5 text-xs text-clay">
                        {suggestion.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {type === "task" && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onTaskDueDateChange(todayISO)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              taskDueDate === todayISO
                ? "bg-sage text-bg"
                : "bg-bg text-brown/60"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onTaskDueDateChange(tomorrowISO)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              taskDueDate === tomorrowISO
                ? "bg-sage text-bg"
                : "bg-bg text-brown/60"
            }`}
          >
            Tomorrow
          </button>
          <button
            onClick={() => onTaskDueDateChange(thisWeekISO)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              taskDueDate === thisWeekISO
                ? "bg-sage text-bg"
                : "bg-bg text-brown/60"
            }`}
          >
            This week
          </button>
          <input
            type="date"
            value={taskDueDate}
            onChange={(e) => onTaskDueDateChange(e.target.value)}
            className="rounded-lg bg-bg px-2.5 py-1 text-xs text-brown/60 focus:outline-none focus:ring-2 focus:ring-sage"
          />
          {taskDueDate && (
            <button
              onClick={() => onTaskDueDateChange("")}
              aria-label="Clear due date"
              className="rounded-full p-1 text-brown/30 transition-colors hover:text-clay"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {type === "expense" && (
        <>
          <input
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            inputMode="numeric"
            placeholder="Amount (IDR)"
            className={`mt-2 w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 ${
              isAmountInvalid ? "ring-2 ring-clay" : "focus:ring-sage"
            }`}
          />
          {isAmountInvalid && (
            <p className="mt-1 text-xs text-clay">Enter a valid number.</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {categories.map((c) => {
              const custom = customCategories.find((cc) => cc.name === c);

              const isConfirmingDelete =
                custom && deletingCategoryId === custom.id;

              return (
                <AnimatePresence mode="wait" initial={false} key={c}>
                  {isConfirmingDelete ? (
                    <motion.span
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-clay/15 px-2.5 py-1 text-xs text-clay"
                    >
                      Delete &ldquo;{c}&rdquo;?
                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteCategory(custom.id)}
                        className="font-medium underline underline-offset-2"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCategoryId(null)}
                        className="text-brown/50"
                      >
                        No
                      </button>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="chip"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="relative inline-flex"
                    >
                      <button
                        type="button"
                        onClick={() => onCategoryChange(c)}
                        className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                          category === c
                            ? "bg-clay text-bg"
                            : "bg-bg text-brown/60"
                        } ${custom ? "pr-6" : ""}`}
                      >
                        {c}
                      </button>
                      {custom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCategoryId(custom.id);
                          }}
                          aria-label={`Delete category ${c}`}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors ${
                            category === c
                              ? "text-bg/70 hover:text-bg"
                              : "text-brown/30 hover:text-clay"
                          }`}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              );
            })}

            <AnimatePresence mode="wait" initial={false}>
              {isAddingCategory ? (
                <motion.input
                  key="input"
                  autoFocus
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleNewCategoryKeyDown}
                  onBlur={handleNewCategoryBlur}
                  placeholder="New category"
                  className="w-28 rounded-full border-none bg-bg px-2.5 py-1 text-xs text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
                />
              ) : (
                <motion.button
                  key="button"
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  onClick={() => setIsAddingCategory(true)}
                  className="rounded-full border border-dashed border-brown/25 px-2.5 py-1 text-xs text-brown/45 transition-colors hover:border-sage hover:text-sage-deep"
                >
                  + Add
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-2.5 w-full rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}
