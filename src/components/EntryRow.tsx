"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  type PanInfo,
} from "framer-motion";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Copy,
  Pin,
  MoreHorizontal,
} from "lucide-react";
import { formatIDR, formatRelativeTime, formatDueLabel } from "@/lib/format";
import type { Entry } from "@/lib/hooks/useEntries";

type EntryRowProps = {
  entry: Entry;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  isJustAdded: boolean;
  editLabel: string;
  editAmount: string;
  editDueDate: string;
  onEditLabelChange: (value: string) => void;
  onEditAmountChange: (value: string) => void;
  onEditDueDateChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onStartEdit: () => void;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onToggleTask: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  // Fired when the user swipes the row past the delete threshold on
  // mobile. Deliberately separate from onConfirmDelete — that prop belongs
  // to the tap-to-confirm flow (isConfirmingDelete), which likely tracks
  // its own "which row is pending" state upstream. Swipe is a distinct,
  // single-step gesture and shouldn't be forced through that state
  // machine. Optional so this stays backward-compatible until the parent
  // wires it up.
  onSwipeDelete?: () => void;
};

const MOBILE_QUERY = "(max-width: 767px)";

// Subscribes to the same md: breakpoint (768px) the rest of this component
// already uses for mobile vs desktop layout, so swipe-to-delete switches on
// at the exact same point the "…" menu does. useSyncExternalStore (rather
// than useState+useEffect) is the correct pattern for reading an external
// browser API like matchMedia: it returns a safe `false` on the server
// (getServerSnapshot) so SSR/hydration output matches, then re-reads the
// real value on the client without ever calling setState synchronously
// inside an effect body.
function subscribeMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot() {
  return false;
}

export default function EntryRow({
  entry,
  isEditing,
  isConfirmingDelete,
  isJustAdded,
  editLabel,
  editAmount,
  editDueDate,
  onEditLabelChange,
  onEditAmountChange,
  onEditDueDateChange,
  onCancelEdit,
  onSaveEdit,
  onStartEdit,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
  onToggleTask,
  onTogglePin,
  onDuplicate,
  onSwipeDelete,
}: EntryRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Swipe-to-delete: mobile-only (touch), gated on the same breakpoint the
  // rest of this component already uses for mobile vs desktop layout
  // (md: = 768px), rather than pointer-type detection, so the behavior
  // switches at the exact same point the "…" menu does.
  const isMobile = useSyncExternalStore(
    subscribeMobileQuery,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );
  const swipeX = useMotionValue(0);
  const SWIPE_THRESHOLD = 72;

  function handleSwipeDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.x < -SWIPE_THRESHOLD && onSwipeDelete) {
      onSwipeDelete();
    } else {
      animate(swipeX, 0, { type: "spring", stiffness: 420, damping: 30 });
    }
  }

  // Close the mobile "…" menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function runAndClose(action: () => void) {
    action();
    setMenuOpen(false);
  }

  if (isEditing) {
    return (
      <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-sage/40">
        <input
          value={editLabel}
          onChange={(e) => onEditLabelChange(e.target.value)}
          className="w-full rounded-lg border-none bg-bg px-2.5 py-1.5 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-sage"
          autoFocus
        />
        {entry.type === "expense" && (
          <input
            value={editAmount}
            onChange={(e) => onEditAmountChange(e.target.value)}
            inputMode="numeric"
            className="mt-1.5 w-full rounded-lg border-none bg-bg px-2.5 py-1.5 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-sage"
          />
        )}
        {entry.type === "task" && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => onEditDueDateChange(e.target.value)}
              className="rounded-lg border-none bg-bg px-2.5 py-1.5 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-sage"
            />
            {editDueDate && (
              <button
                onClick={() => onEditDueDateChange("")}
                aria-label="Clear due date"
                className="rounded-full p-1 text-brown/30 transition-colors hover:text-clay"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-1.5">
          <button
            onClick={onCancelEdit}
            aria-label="Cancel edit"
            className="rounded-full p-1.5 text-brown/50 transition-colors hover:bg-bg"
          >
            <X size={14} />
          </button>
          <button
            onClick={onSaveEdit}
            aria-label="Save edit"
            className="rounded-full bg-sage-deep p-1.5 text-bg transition-opacity hover:opacity-90"
          >
            <Check size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (isConfirmingDelete) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 ring-1 ring-clay/50">
        <p className="text-sm text-brown">
          Delete &ldquo;{entry.label}&rdquo;?
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onCancelDelete}
            className="rounded-full px-3 py-1 text-xs font-medium text-brown/60 transition-colors hover:bg-bg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmDelete}
            className="rounded-full bg-clay px-3 py-1 text-xs font-medium text-bg transition-opacity hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  const due =
    entry.type === "task" && entry.dueDate
      ? formatDueLabel(entry.dueDate)
      : null;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {isMobile && (
        <div className="absolute inset-0 flex items-center justify-end rounded-xl bg-clay px-5">
          <Trash2 size={18} className="text-bg" />
        </div>
      )}
      <motion.div
        initial={
          isJustAdded ? { opacity: 0, y: -6, rotate: -4, scale: 0.96 } : false
        }
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.6 }}
        style={{ x: swipeX }}
        drag={isMobile ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        onDragEnd={handleSwipeDragEnd}
        className={`group flex items-start justify-between rounded-xl px-4 py-2.5 transition-colors ${
          isMobile ? "bg-surface" : "bg-surface/60 hover:bg-surface"
        } ${entry.pinned ? "ring-1 ring-clay/40" : ""}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          {entry.type === "task" ? (
            <button
              onClick={onToggleTask}
              className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-sage transition-colors ${
                entry.done ? "bg-sage" : "bg-transparent"
              }`}
              aria-label="Toggle task done"
            />
          ) : (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
          )}
          <div className="min-w-0">
            <p
              className={`truncate text-sm ${
                entry.done ? "text-brown/40 line-through" : "text-brown"
              }`}
            >
              {entry.label}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {entry.category && (
                <span className="rounded-full bg-sage/15 px-1.5 py-0.5 text-[11px] font-medium leading-none text-sage-deep">
                  {entry.category}
                </span>
              )}
              <span className="text-xs text-brown/45">
                {formatRelativeTime(entry.createdAt)}
                {due && (
                  <span
                    className={due.overdue && !entry.done ? "text-clay" : ""}
                  >
                    {" · "}
                    {due.text}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-1.5">
          {entry.amount !== undefined && (
            <span className="mr-1 mt-0.5 text-sm font-medium text-brown/70">
              {formatIDR(entry.amount)}
            </span>
          )}

          {/* Desktop: full icon row, unchanged */}
          <div className="hidden shrink-0 items-start gap-1.5 md:flex">
            {entry.type === "task" && (
              <button
                onClick={onTogglePin}
                aria-label={entry.pinned ? "Unpin task" : "Pin task"}
                className={`rounded-full p-2.5 transition-colors ${
                  entry.pinned
                    ? "text-clay"
                    : "text-brown/45 hover:bg-bg hover:text-brown/70"
                }`}
              >
                <Pin size={13} fill={entry.pinned ? "currentColor" : "none"} />
              </button>
            )}
            <button
              onClick={onDuplicate}
              aria-label="Duplicate entry"
              className="rounded-full p-2.5 text-brown/45 transition-colors hover:bg-bg hover:text-brown/70"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={onStartEdit}
              aria-label="Edit entry"
              className="rounded-full p-2.5 text-brown/45 transition-colors hover:bg-bg hover:text-brown/70"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onStartDelete}
              aria-label="Delete entry"
              className="rounded-full p-2.5 text-brown/45 transition-colors hover:bg-bg hover:text-clay"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Mobile: single "…" trigger opening a menu, so tap targets are full-width rows instead of four cramped icons */}
          <div className="relative shrink-0 md:hidden" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`rounded-full p-2.5 transition-colors ${
                menuOpen
                  ? "bg-bg text-brown/70"
                  : "text-brown/45 hover:bg-bg hover:text-brown/70"
              }`}
            >
              <MoreHorizontal size={16} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="entry-menu"
                  role="menu"
                  aria-label="Entry actions"
                  initial={{ opacity: 0, scale: 0.94, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="absolute right-0 top-full z-20 mt-1 min-w-[170px] overflow-hidden rounded-xl bg-surface shadow-md ring-1 ring-brown/10"
                >
                  {entry.type === "task" && (
                    <button
                      role="menuitem"
                      onClick={() => runAndClose(onTogglePin)}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brown transition-colors hover:bg-bg"
                    >
                      <Pin
                        size={15}
                        className={entry.pinned ? "text-clay" : "text-brown/45"}
                        fill={entry.pinned ? "currentColor" : "none"}
                      />
                      {entry.pinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => runAndClose(onDuplicate)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brown transition-colors hover:bg-bg"
                  >
                    <Copy size={15} className="text-brown/45" />
                    Duplicate
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => runAndClose(onStartEdit)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brown transition-colors hover:bg-bg"
                  >
                    <Pencil size={15} className="text-brown/45" />
                    Edit
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => runAndClose(onStartDelete)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-clay transition-colors hover:bg-clay/10"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
