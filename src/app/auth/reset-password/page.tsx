"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setHasSession(data.session !== null);
      setCheckingSession(false);
    }
    checkSession();
  }, []);

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = newPassword.length >= 6 && newPassword === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("sending");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("sent");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-sm text-brown/60">Loading...</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-soft bg-surface p-6 text-center shadow-sm">
          <h1 className="font-display text-2xl font-medium text-sage-deep">
            Link expired
          </h1>
          <p className="mt-2 text-sm text-brown/60">
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-4 inline-block text-sm text-sage-deep underline-offset-2 hover:underline"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-soft bg-surface p-6 shadow-sm">
        <h1 className="font-display text-2xl font-medium text-sage-deep">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-brown/60">
          Choose a new password for your account.
        </p>

        {status === "sent" ? (
          <p className="mt-6 text-sm text-brown">
            Password updated. Redirecting...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2.5">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min. 6 characters)"
                minLength={6}
                required
                className="w-full rounded-lg border-none bg-bg px-3 py-2 pr-10 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brown/40 transition-colors hover:text-brown/70"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className={`w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 ${
                passwordsMismatch ? "ring-2 ring-clay" : "focus:ring-sage"
              }`}
            />
            {passwordsMismatch && (
              <p className="text-xs text-clay">Passwords don&apos;t match.</p>
            )}
            <button
              type="submit"
              disabled={!canSubmit || status === "sending"}
              className="rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {status === "sending" ? "Updating..." : "Update password"}
            </button>
            {status === "error" && (
              <p className="text-xs text-clay">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
