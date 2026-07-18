import HomeDashboard from "@/components/HomeDashboard";

// No client-side auth check here on purpose: middleware.ts already redirects
// unauthenticated requests to "/login" before this page ever renders, since
// "/dashboard" is not in the isPublicRoute list (see src/lib/supabase/middleware.ts).
export default function DashboardPage() {
  return <HomeDashboard />;
}
