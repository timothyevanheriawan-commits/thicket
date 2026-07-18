import { createClient } from "@supabase/supabase-js";

// Server-only. NEVER import this file in a Client Component.
// Uses the service role key, which bypasses RLS entirely.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
