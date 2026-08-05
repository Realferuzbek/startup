import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

// The authenticated user together with their profile row. `profile` may be null
// only in the brief window before the handle_new_user() trigger's row is
// visible; callers that need the role should treat null as "no access".
export type CurrentUser = {
  user: User;
  profile: Profile | null;
};

// Returns the authenticated user + profile, or null. Uses getUser() — which
// validates the token with the auth server — NEVER getSession(), which is not
// safe for authorization decisions. Wrapped in React `cache` so the header and
// the page it wraps share one getUser() round-trip per request.
export const getCurrentUser = cache(
  async function getCurrentUser(): Promise<CurrentUser | null> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    return { user, profile };
  },
);

// For server components: require an authenticated user or redirect to login,
// preserving the attempted path (exposed as the x-pathname request header by
// src/proxy.ts) so the user returns there after signing in.
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (current) {
    return current;
  }

  const locale = await getLocale();
  const requestHeaders = await headers();
  const attemptedPath = requestHeaders.get("x-pathname") ?? `/${locale}`;
  redirect(`/${locale}/login?next=${encodeURIComponent(attemptedPath)}`);
}

// Require an authenticated user with a specific role. Built now (only 'user'
// and 'admin' exist) as the seam Chunk 3's admin area will use. A non-matching
// role redirects to the not-authorized page.
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const current = await requireUser();
  if (current.profile?.role !== role) {
    const locale = await getLocale();
    redirect(`/${locale}/not-authorized`);
  }
  return current;
}
