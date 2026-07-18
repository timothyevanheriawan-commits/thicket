"use client";

import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

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

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setStatus("sending");
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    // Hard navigation (not router.push + router.refresh): a full page
    // reload already fetches fresh data, and avoids the same App Router
    // redirect race described in src/app/page.tsx.
    window.location.href = "/dashboard";
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
          className="rounded-[var(--radius-soft)] bg-surface p-6 shadow-sm"
        >
          <h1 className="font-display text-2xl font-medium text-sage-deep">
            Thicket
          </h1>
          <p className="mt-1 text-sm text-brown/60">Sign in to your account.</p>

          <form
            onSubmit={handlePasswordLogin}
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
                placeholder="Password"
                required
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

            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-brown/50 underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={status === "sending" ? "sending" : "idle"}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="inline-block"
                >
                  {status === "sending" ? "Signing in..." : "Sign in"}
                </motion.span>
              </AnimatePresence>
            </button>
            <AnimatePresence>
              {status === "error" && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="text-xs text-clay"
                >
                  {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>
          </form>

          <p className="mt-5 text-xs text-brown/50">
            No account?{" "}
            <Link
              href="/signup"
              className="text-sage-deep underline-offset-2 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
