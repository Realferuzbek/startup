import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type AmenityOption = { id: number; name_uz: string; name_ru: string };
export type OwnerPropertyOption = { id: string; address_line: string };
export type ListingStatus = Database["public"]["Enums"]["listing_status"];

export async function getAmenities(): Promise<AmenityOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("amenities")
    .select("id, name_uz, name_ru")
    .order("sort_order");
  return data ?? [];
}

export async function getOwnerProperties(
  userId: string,
): Promise<OwnerPropertyOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, address_line")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getOwnerListings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, price_amount, price_currency, status, expires_at")
    .eq("owner_id", userId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Loads one of the caller's own listings plus its selected amenity ids, for the
// edit form. Returns null if it does not exist or is not the caller's.
export async function getListingForEdit(userId: string, id: string) {
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, property_id, title, description, content_language, price_amount, price_currency, rental_period, rooms, area_sqm, floor, total_floors, available_from",
    )
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!listing) return null;

  const { data: amenityRows } = await supabase
    .from("listing_amenities")
    .select("amenity_id")
    .eq("listing_id", id);

  return { listing, amenityIds: (amenityRows ?? []).map((r) => r.amenity_id) };
}
