"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Pin } from "lucide-react";
import type { Entry } from "@/lib/hooks/useEntries";

function formatDueLabel(due: Date): { text: string; overdue: boolean } {
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      text: diffDays === -1 ? "Overdue 1d" : `Overdue ${-diffDays}d`,
      overdue: true,
    };
  }
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  if (diffDays < 7) {
    return {
      text: `Due ${dueDay.toLocaleDateString("en-US", { weekday: "short" })}`,
      overdue: false,
    };
  }
  return {
    text: `Due ${dueDay.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`,
    overdue: false,
  };
}

export default function TaskWidget({
  tasks,
  onToggle,
  onTogglePin,
}: {
  tasks: Entry[];
  onToggle: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  return (
    <div className="rounded-soft bg-surface p-4 shadow-sm">
      <AnimatePresence mode="wait" initial={false}>
        {tasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <p className="font-display text-sm font-medium text-sage-deep">
              Tasks
            </p>
            <p className="mt-2 text-xs text-brown/50">
              No open tasks — nice and clear.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <p className="mb-2.5 font-display text-sm font-medium text-sage-deep">
              Tasks
            </p>
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {tasks.map((task) => {
                  const due = task.dueDate
                    ? formatDueLabel(task.dueDate)
                    : null;
                  return (
                    <motion.li
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => onToggle(task.id)}
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-sage bg-transparent transition-colors"
                        aria-label="Toggle task done"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-brown">
                          {task.label}
                        </p>
                      </div>
                      {due && (
                        <span
                          className={`shrink-0 text-xs ${
                            due.overdue ? "text-clay" : "text-brown/40"
                          }`}
                        >
                          {due.text}
                        </span>
                      )}
                      <button
                        onClick={() => onTogglePin(task.id)}
                        aria-label={task.pinned ? "Unpin task" : "Pin task"}
                        className={`-m-1.5 shrink-0 rounded-full p-2.5 transition-colors ${
                          task.pinned
                            ? "text-clay"
                            : "text-brown/40 hover:text-brown/70"
                        }`}
                      >
                        <motion.span
                          key={task.pinned ? "pinned" : "unpinned"}
                          initial={{ scale: 1.5 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 20,
                          }}
                          className="flex"
                        >
                          <Pin
                            size={13}
                            fill={task.pinned ? "currentColor" : "none"}
                          />
                        </motion.span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
