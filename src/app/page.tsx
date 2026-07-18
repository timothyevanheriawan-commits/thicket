"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Landing from "@/components/Landing";

type AuthState = "checking" | "authenticated" | "anonymous";

export default function Page() {
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data?.user) {
        // Hard navigation instead of router.replace(): on a cold-start
        // navigation to "/", calling router.replace() from next/navigation
        // raced the App Router's client reducer initialization, throwing
        // "Router action dispatched before initialization" and leaving the
        // old page (Landing) mounted alongside the new one instead of
        // cleanly unmounting. window.location.href skips the client-side
        // router entirely (full page reload), so that race can't happen.
        window.location.href = "/dashboard";
        return;
      }
      setAuthState("anonymous");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState !== "anonymous") {
    // Brief blank flash while the session check resolves, per product decision.
    // Covers both "checking" and the moment right before the "/dashboard" redirect fires.
    return <div className="min-h-screen" />;
  }

  return <Landing />;
}
