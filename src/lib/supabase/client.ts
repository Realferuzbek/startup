import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Browser Supabase client. Uses only the public anon key, which is safe to
// expose to the client. Never use the service role key here. Typed with the
// generated Database schema so all queries are type-checked.
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
