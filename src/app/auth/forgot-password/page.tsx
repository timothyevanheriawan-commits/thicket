"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-soft bg-surface p-6 shadow-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-brown/50 hover:text-brown/70"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </Link>

        <h1 className="mt-3 font-display text-2xl font-medium text-sage-deep">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-brown/60">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>

        {status === "sent" ? (
          <p className="mt-6 text-sm text-brown">
            Check <span className="font-medium">{email}</span> for a link to
            reset your password.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border-none bg-bg px-3 py-2 text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-sage-deep py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "Send reset link"}
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
