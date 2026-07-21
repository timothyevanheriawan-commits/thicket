import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// `next` comes straight from the URL an attacker can craft, so it can't be
// trusted as-is before being dropped into a redirect. Only allow same-origin
// relative paths: must start with a single "/" (not "//", which some
// browsers resolve as protocol-relative to an arbitrary host), and must not
// contain a backslash (browsers normalize "/\evil.com" to "//evil.com") or
// a "://" scheme separator. Anything that doesn't match falls back to "/".
function sanitizeNextPath(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next.includes("\\") || next.includes("://")) return "/";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Session cookie is now set by the server client above.
      // Redirect to the intended destination.
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Token was present but invalid/expired — send to login with a
    // human-readable reason instead of a silent failure.
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // No token_hash/type in the URL at all — malformed or tampered link.
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Invalid or missing confirmation link.")}`,
  );
}
