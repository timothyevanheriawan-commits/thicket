"use client";

import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data?.user) {
        // Hard navigation, not router.replace(): see src/app/page.tsx for
        // why (Next.js App Router race condition on cold-start redirects).
        window.location.href = "/dashboard";
        return;
      }
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Password strength: length + character variety, purely a UI hint.
  // Doesn't block submission — the 6-char minLength requirement is separate.
  function passwordStrength(pw: string): { label: string; score: number } {
    if (pw.length === 0) return { label: "", score: 0 };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", score };
    if (score <= 3) return { label: "Fair", score };
    return { label: "Strong", score };
  }

  const strength = passwordStrength(password);
  const strengthColor =
    strength.label === "Weak"
      ? "text-clay"
      : strength.label === "Fair"
        ? "text-brown/50"
        : "text-sage-deep";

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    email.trim() !== "" && password.length >= 6 && password === confirmPassword;

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("sending");
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    // With "Confirm email" disabled in Supabase, signUp() returns an
    // active session immediately — no email round-trip needed.
    if (data.session) {
      // Hard navigation (not router.push + router.refresh): a full page
      // reload already fetches fresh data, and avoids the same App Router
      // redirect race described in src/app/page.tsx.
      window.location.href = "/dashboard";
      return;
    }

    // Fallback: confirmation is still required on the project (e.g. the
    // dashboard toggle hasn't been switched off yet) — surface that instead
    // of silently doing nothing.
    setStatus("sent");
  }

  if (!authChecked) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-brown/40 transition-colors hover:text-brown/70"
        >
          <ArrowLeft size={13} />
          Back to Thicket
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="rounded-soft bg-surface p-6 shadow-sm"
        >
          <h1 className="font-display text-2xl font-medium text-sage-deep">
            Thicket
          </h1>
          <p className="mt-1 text-sm text-brown/60">
            Create an account to sync across your devices.
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {status === "sent" ? (
              <motion.p
                key="sent"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="mt-6 text-sm text-brown"
              >
                Check <span className="font-medium">{email}</span> for a
                confirmation link to finish signing up.
              </motion.p>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                onSubmit={handleSignup}
                className="mt-6 flex flex-col gap-2.5"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min. 6 characters)"
                    required
                    minLength={6}
                    className="w-full rounded-lg border-none bg-bg px-3 py-2 pr-10 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
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

                <AnimatePresence>
                  {password.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className={`text-xs ${strengthColor}`}
                    >
                      {strength.label}
                    </motion.p>
                  )}
                </AnimatePresence>

                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
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
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="text-xs text-clay"
                    >
                      Passwords don&apos;t match.
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={!canSubmit || status === "sending"}
                  className="w-full rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={status === "sending" ? "sending" : "idle"}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="inline-block"
                    >
                      {status === "sending" ? "Creating account..." : "Sign up"}
                    </motion.span>
                  </AnimatePresence>
                </button>
                <AnimatePresence>
                  {status === "error" && (
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
                      {errorMsg}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-5 text-xs text-brown/50">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-sage-deep underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
