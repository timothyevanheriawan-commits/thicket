"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LogOut, Trash2, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat";
import { useBudgets } from "@/lib/hooks/useBudgets";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTemplates } from "@/lib/hooks/useTemplates";
import { formatIDR, type CurrencyFormat } from "@/lib/format";
import type { Category, EntryType } from "@/lib/hooks/useEntries";

type Status = "idle" | "sending" | "sent" | "error";

export default function SettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>("idle");
  const [nameError, setNameError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>("idle");
  const [passwordError, setPasswordError] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<Status>("idle");
  const [deleteError, setDeleteError] = useState("");

  const { format: currencyFormat, setFormat: setCurrencyFormat } =
    useCurrencyFormat();

  const {
    weeklyBudget,
    categoryBudgets,
    setWeeklyBudget,
    setCategoryBudget,
    loading: budgetsLoading,
  } = useBudgets();
  const { allCategories } = useCategories();

  const { templates, addTemplate, deleteTemplate } = useTemplates();
  const [newTemplateLabel, setNewTemplateLabel] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<EntryType>("expense");
  const [newTemplateAmount, setNewTemplateAmount] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] =
    useState<Category>("Food");

  function handleAddTemplate(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTemplateLabel.trim();
    if (!trimmed) return;

    addTemplate({
      label: trimmed,
      type: newTemplateType,
      ...(newTemplateType === "expense"
        ? {
            amount: newTemplateAmount ? Number(newTemplateAmount) : undefined,
            category: newTemplateCategory,
          }
        : {}),
    });

    setNewTemplateLabel("");
    setNewTemplateAmount("");
  }

  // Text buffers for the budget inputs, separate from the saved numeric
  // values — lets the user type freely (including transient invalid states
  // like "1.") without every keystroke round-tripping through Supabase.
  // Seeded once from the loaded budgets, then left alone so a background
  // refetch never clobbers what the user is mid-typing.
  const [weeklyBudgetInput, setWeeklyBudgetInput] = useState("");
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<
    Record<string, string>
  >({});
  const budgetsSeeded = useRef(false);

  useEffect(() => {
    if (budgetsLoading || budgetsSeeded.current) return;
    budgetsSeeded.current = true;
    setWeeklyBudgetInput(weeklyBudget !== null ? String(weeklyBudget) : "");
    setCategoryBudgetInputs(
      Object.fromEntries(
        Object.entries(categoryBudgets).map(([k, v]) => [k, String(v)]),
      ),
    );
  }, [budgetsLoading, weeklyBudget, categoryBudgets]);

  function commitWeeklyBudget() {
    const trimmed = weeklyBudgetInput.trim();
    if (trimmed === "") {
      setWeeklyBudget(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      // Invalid — revert the input to the last saved value rather than
      // silently persisting garbage.
      setWeeklyBudgetInput(weeklyBudget !== null ? String(weeklyBudget) : "");
      return;
    }
    setWeeklyBudget(parsed);
  }

  function commitCategoryBudget(category: string) {
    const raw = categoryBudgetInputs[category] ?? "";
    const trimmed = raw.trim();
    if (trimmed === "") {
      setCategoryBudget(category, null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      setCategoryBudgetInputs((prev) => ({
        ...prev,
        [category]:
          categoryBudgets[category] !== undefined
            ? String(categoryBudgets[category])
            : "",
      }));
      return;
    }
    setCategoryBudget(category, parsed);
  }

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");
        setDisplayName((user.user_metadata?.display_name as string) ?? "");
      }
    }
    loadUser();
  }, []);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameStatus("sending");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });

    if (error) {
      setNameStatus("error");
      setNameError(error.message);
      return;
    }
    setNameStatus("sent");
    setTimeout(() => setNameStatus("idle"), 2000);
  }

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword =
    newPassword.length >= 6 && newPassword === confirmPassword;

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!canSubmitPassword) return;

    setPasswordStatus("sending");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordStatus("error");
      setPasswordError(error.message);
      return;
    }
    setPasswordStatus("sent");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordStatus("idle"), 2000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleteStatus("sending");

    const res = await fetch("/api/delete-account", { method: "POST" });
    const body = await res.json();

    if (!res.ok) {
      setDeleteStatus("error");
      setDeleteError(body.error ?? "Failed to delete account.");
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-24 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="rounded-full p-2 text-brown/40 transition-colors hover:bg-surface hover:text-brown/70"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-sage-deep">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-brown/60">{email}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Display name */}
        <div className="rounded-soft bg-surface p-4 shadow-sm">
          <h2 className="font-display text-sm font-medium text-brown">
            Display name
          </h2>
          <form onSubmit={handleSaveName} className="mt-2.5 flex gap-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <button
              type="submit"
              disabled={nameStatus === "sending"}
              className="shrink-0 rounded-lg bg-sage-deep px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={nameStatus}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="inline-block"
                >
                  {nameStatus === "sending"
                    ? "Saving..."
                    : nameStatus === "sent"
                      ? "Saved"
                      : "Save"}
                </motion.span>
              </AnimatePresence>
            </button>
          </form>
          <AnimatePresence>
            {nameStatus === "error" && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="mt-1.5 text-xs text-clay"
              >
                {nameError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Currency format */}
        <div className="rounded-soft bg-surface p-4 shadow-sm">
          <h2 className="font-display text-sm font-medium text-brown">
            Currency format
          </h2>
          <div className="mt-2.5 flex gap-2">
            {(
              [
                { value: "standard", label: "Standard" },
                { value: "comma", label: "Comma" },
                { value: "compact", label: "Compact" },
              ] as { value: CurrencyFormat; label: string }[]
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setCurrencyFormat(option.value)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  currencyFormat === option.value
                    ? "bg-sage text-bg"
                    : "bg-bg text-brown/60"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-brown/50">
            Preview: {formatIDR(1226000, currencyFormat)}
          </p>
        </div>

        {/* Budgets */}
        <div className="rounded-soft bg-surface p-4 shadow-sm">
          <h2 className="font-display text-sm font-medium text-brown">
            Budgets
          </h2>
          <p className="mt-1 text-xs text-brown/50">
            Leave blank for no limit. Crossing a budget shows up as a soft color
            shift in the feed — nothing gets blocked.
          </p>

          <div className="mt-3">
            <label className="text-xs font-medium text-brown/70">
              Weekly total
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-sm text-brown/50">Rp</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={weeklyBudgetInput}
                onChange={(e) => setWeeklyBudgetInput(e.target.value)}
                onBlur={commitWeeklyBudget}
                placeholder="No limit"
                className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
          </div>

          {allCategories.length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-medium text-brown/70">
                Per category
              </label>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {allCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-brown/60">
                      {cat}
                    </span>
                    <span className="text-sm text-brown/50">Rp</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={categoryBudgetInputs[cat] ?? ""}
                      onChange={(e) =>
                        setCategoryBudgetInputs((prev) => ({
                          ...prev,
                          [cat]: e.target.value,
                        }))
                      }
                      onBlur={() => commitCategoryBudget(cat)}
                      placeholder="No limit"
                      className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recurring templates */}
        <div className="rounded-soft bg-surface p-4 shadow-sm">
          <h2 className="font-display text-sm font-medium text-brown">
            Templates
          </h2>
          <p className="mt-1 text-xs text-brown/50">
            One-tap shortcuts for entries you log repeatedly &mdash; rent, a
            subscription, a recurring transfer. Tapping one in quick-add fills
            the form; you still confirm before it&apos;s logged.
          </p>

          {templates.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-brown">
                    <Bookmark size={13} className="shrink-0 text-brown/40" />
                    <span className="truncate">{t.label}</span>
                    {t.type === "expense" && t.amount !== undefined && (
                      <span className="shrink-0 text-xs text-brown/50">
                        {formatIDR(t.amount, currencyFormat)}
                        {t.category ? ` \u00B7 ${t.category}` : ""}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    aria-label={`Delete ${t.label} template`}
                    className="shrink-0 rounded-full p-1.5 text-brown/40 transition-colors hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleAddTemplate}
            className="mt-3 flex flex-col gap-2 border-t border-brown/10 pt-3"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewTemplateType("expense")}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  newTemplateType === "expense"
                    ? "bg-sage text-bg"
                    : "bg-bg text-brown/60"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setNewTemplateType("task")}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  newTemplateType === "task"
                    ? "bg-sage text-bg"
                    : "bg-bg text-brown/60"
                }`}
              >
                Task
              </button>
            </div>

            <input
              value={newTemplateLabel}
              onChange={(e) => setNewTemplateLabel(e.target.value)}
              placeholder="Rent, Netflix, gym..."
              className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
            />

            {newTemplateType === "expense" && (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={newTemplateAmount}
                  onChange={(e) => setNewTemplateAmount(e.target.value)}
                  placeholder="Amount (optional)"
                  className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
                />
                <select
                  value={newTemplateCategory}
                  onChange={(e) =>
                    setNewTemplateCategory(e.target.value as Category)
                  }
                  className="shrink-0 rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-sage"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={!newTemplateLabel.trim()}
              className="rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Add template
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="rounded-soft bg-surface p-4 shadow-sm">
          <h2 className="font-display text-sm font-medium text-brown">
            Change password
          </h2>
          <form
            onSubmit={handleChangePassword}
            className="mt-2.5 flex flex-col gap-2"
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min. 6 characters)"
                minLength={6}
                className="w-full rounded-lg border-none bg-bg px-3 py-2 pr-10 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brown/40 transition-colors hover:text-brown/70"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {showPassword ? (
                    <motion.span
                      key="eye-off"
                      initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="flex"
                    >
                      <EyeOff size={16} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="eye"
                      initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="flex"
                    >
                      <Eye size={16} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 ${
                passwordsMismatch ? "ring-2 ring-clay" : "focus:ring-sage"
              }`}
            />
            <AnimatePresence>
              {passwordsMismatch && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="text-xs text-clay"
                >
                  Passwords don&apos;t match.
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={!canSubmitPassword || passwordStatus === "sending"}
              className="rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={passwordStatus}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="inline-block"
                >
                  {passwordStatus === "sending"
                    ? "Updating..."
                    : passwordStatus === "sent"
                      ? "Password updated"
                      : "Update password"}
                </motion.span>
              </AnimatePresence>
            </button>
            <AnimatePresence>
              {passwordStatus === "error" && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="text-xs text-clay"
                >
                  {passwordError}
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 rounded-soft bg-surface p-4 text-sm font-medium text-brown shadow-sm transition-colors hover:bg-surface/70"
        >
          <LogOut size={15} />
          Sign out
        </button>

        {/* Danger zone */}
        <div className="rounded-soft bg-surface p-4 shadow-sm ring-1 ring-clay/30">
          <h2 className="font-display text-sm font-medium text-clay">
            Delete account
          </h2>
          <p className="mt-1 text-xs text-brown/50">
            This permanently deletes your account and all your entries. This
            cannot be undone.
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {!confirmingDelete ? (
              <motion.button
                key="trigger"
                onClick={() => setConfirmingDelete(true)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-clay/10 px-3 py-1.5 text-xs font-medium text-clay transition-colors hover:bg-clay/20"
              >
                <Trash2 size={13} />
                Delete my account
              </motion.button>
            ) : (
              <motion.div
                key="confirm-panel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="mt-3 flex flex-col gap-2"
              >
                <p className="text-xs text-brown">
                  Are you sure? Type your intent below to confirm.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brown/60 transition-colors hover:bg-bg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteStatus === "sending"}
                    className="flex-1 rounded-lg bg-clay px-3 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {deleteStatus === "sending"
                      ? "Deleting..."
                      : "Yes, delete permanently"}
                  </button>
                </div>
                <AnimatePresence>
                  {deleteStatus === "error" && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="text-xs text-clay"
                    >
                      {deleteError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
