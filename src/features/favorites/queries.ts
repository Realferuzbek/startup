import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// The set of listing ids the user has favorited — used to fill the heart on
// cards. One query per page (not per card), so no N+1.
export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.listing_id));
}

export type FavoriteCard =
  Database["public"]["Functions"]["get_favorite_cards"]["Returns"][number];

// The caller's favorites, including ones no longer publicly visible (each tagged
// with is_available). Public-safe fields only (SECURITY DEFINER RPC).
export async function getFavoriteCards(): Promise<FavoriteCard[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_favorite_cards");
  return data ?? [];
}
