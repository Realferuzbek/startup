"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/session";

export type ToggleFavoriteResult = { favorited: boolean } | { error: string };

// Toggle the caller's favorite for a listing (RLS scopes rows to the caller).
// Returns the new state; the client uses it to confirm/revert an optimistic UI.
export async function toggleFavorite(
  listingId: string,
): Promise<ToggleFavoriteResult> {
  const current = await getCurrentUser();
  if (!current) return { error: "signInRequired" };
  if (!z.uuid().safeParse(listingId).success) return { error: "errorGeneric" };

  const supabase = await createClient();
  const uid = current.user.id;

  const { data: existing } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", uid)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", uid)
      .eq("listing_id", listingId);
    return { favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: uid, listing_id: listingId });
  if (error) return { error: "errorGeneric" };
  return { favorited: true };
}
