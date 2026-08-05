// SERVER-ONLY BOUNDARY. Importing this file from a Client Component is a
// build-time error, not just a convention. This is the enforcement point for
// the rule that server-side Supabase access never reaches the browser.
import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Server Supabase client for use in Server Components, Route Handlers, and
// Server Actions. It is wired to the request's cookies so the user session is
// read and refreshed on the server.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot set cookies; only Server Actions and
          // Route Handlers can. This is Supabase's documented pattern for that
          // constraint, not error suppression — session refresh also happens
          // in proxy.ts, so ignoring the failure here is safe.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );
}
