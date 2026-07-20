"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

interface QuickAddFabProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}

export default function QuickAddFab({
  isOpen,
  onOpen,
  onClose,
  children,
}: QuickAddFabProps) {
  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Trigger button, mobile only: on desktop the inline QuickAddForm
          in HomeDashboard already covers quick-capture. */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            onClick={onOpen}
            aria-label="Add entry"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sage-deep text-bg shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage md:hidden"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom sheet, mobile only. Guarded by md:hidden rather than not
          rendering on desktop, since duplicateToForm() in HomeDashboard can
          set isOpen=true from a desktop click too (a no-op there, per its
          own comment, because the inline form is always visible). */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              onClick={onClose}
              className="absolute inset-0 bg-brown/40"
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Add entry"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-soft bg-surface p-5 pb-8 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-medium text-sage-deep">
                  Add entry
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-brown/40 transition-colors hover:bg-bg hover:text-brown/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  <X size={18} />
                </button>
              </div>
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
