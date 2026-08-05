import "server-only";

import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Always-anonymous Supabase client for PUBLIC pages. It carries NO session
// cookies, so every query runs as the `anon` role and RLS (plus the column-level
// privacy on `properties`) is the enforcement boundary — even if the visitor
// happens to be signed in. Never use this for host/dashboard flows.
export function createAnonClient() {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}
