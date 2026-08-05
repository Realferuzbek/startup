import "server-only";

import { cache } from "react";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/env";
import { PAGE_SIZE, type ListingFilters } from "./search-params";

const PHOTO_BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos`;
export function photoUrl(path: string): string {
  return `${PHOTO_BASE}/${path}`;
}

export type SearchResultCard = {
  id: string;
  title: string;
  price_amount: number;
  price_currency: string;
  rental_period: "monthly" | "daily";
  rooms: number | null;
  area_sqm: number | null;
  region_id: number | null;
  district_id: number | null;
  verification_status: string;
  created_at: string;
  coverUrl: string | null;
};

// Browse search. Single RPC (amenity AND + total via window count) through the
// always-anon client → RLS is the boundary; only public-safe columns returned.
export async function searchListings(
  filters: ListingFilters,
): Promise<{ listings: SearchResultCard[]; total: number }> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("search_listings", {
    p_region_id: filters.region,
    p_district_id: filters.district,
    p_currency: filters.currency,
    p_price_min: filters.priceMin,
    p_price_max: filters.priceMax,
    p_rooms_min: filters.roomsMin,
    p_rooms_max: filters.roomsMax,
    p_rental_period: filters.period,
    p_amenity_ids: filters.amenities,
    p_sort: filters.sort,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  });
  if (error || !data || data.length === 0) return { listings: [], total: 0 };

  const total = Number(data[0]!.total_count);
  const listings: SearchResultCard[] = data.map((r) => ({
    id: r.id,
    title: r.title,
    price_amount: Number(r.price_amount),
    price_currency: r.price_currency,
    rental_period: r.rental_period,
    rooms: r.rooms,
    area_sqm: r.area_sqm !== null ? Number(r.area_sqm) : null,
    region_id: r.region_id,
    district_id: r.district_id,
    verification_status: r.verification_status,
    created_at: r.created_at,
    coverUrl: r.cover_path ? photoUrl(r.cover_path) : null,
  }));
  return { listings, total };
}

export type PublicListing = {
  id: string;
  title: string;
  description: string | null;
  price_amount: number;
  price_currency: string;
  rental_period: "monthly" | "daily";
  rooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  available_from: string | null;
  created_at: string;
  property_id: string;
  region_id: number | null;
  district_id: number | null;
  verification_status: string;
  reveal_count: number;
};

// One public listing, only if it is currently publicly visible. Selects only
// host-safe columns — never address_line, location, or owner_id. Cached per
// request so generateMetadata and the page share one fetch.
export const getPublicListing = cache(async function getPublicListing(
  id: string,
): Promise<PublicListing | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = createAnonClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("listings")
    .select(
      "id, title, description, price_amount, price_currency, rental_period, rooms, area_sqm, floor, total_floors, available_from, created_at, property_id, reveal_count, properties!inner(region_id, district_id, verification_status)",
    )
    .eq("id", id)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    price_amount: Number(data.price_amount),
    price_currency: data.price_currency,
    rental_period: data.rental_period,
    rooms: data.rooms,
    area_sqm: data.area_sqm !== null ? Number(data.area_sqm) : null,
    floor: data.floor,
    total_floors: data.total_floors,
    available_from: data.available_from,
    created_at: data.created_at,
    property_id: data.property_id,
    region_id: data.properties.region_id,
    district_id: data.properties.district_id,
    verification_status: data.properties.verification_status,
    reveal_count: data.reveal_count,
  };
});

export const getListingPhotos = cache(async function getListingPhotos(
  propertyId: string,
): Promise<{ url: string }[]> {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("property_photos")
    .select("storage_path, display_order")
    .eq("property_id", propertyId)
    .order("display_order");
  return (data ?? []).map((p) => ({ url: photoUrl(p.storage_path) }));
});

export type AmenityLabel = { id: number; name_uz: string; name_ru: string };

export async function getListingAmenities(
  listingId: string,
): Promise<AmenityLabel[]> {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("listing_amenities")
    .select("amenity_id, amenities(id, name_uz, name_ru)")
    .eq("listing_id", listingId);
  return (data ?? [])
    .map((r) => r.amenities)
    .filter((a): a is AmenityLabel => a !== null);
}

export async function getFilterOptions() {
  const supabase = createAnonClient();
  const [regions, districts, amenities] = await Promise.all([
    supabase
      .from("regions")
      .select("id, slug, name_uz, name_ru")
      .order("sort_order"),
    supabase
      .from("districts")
      .select("id, region_id, name_uz, name_ru")
      .order("sort_order"),
    supabase
      .from("amenities")
      .select("id, name_uz, name_ru")
      .order("sort_order"),
  ]);
  const regionRows = regions.data ?? [];
  return {
    regions: regionRows,
    districts: districts.data ?? [],
    amenities: amenities.data ?? [],
    tashkentCityRegionId:
      regionRows.find((r) => r.slug === "tashkent-city")?.id ?? null,
  };
}

export async function getPublicListingIds(): Promise<
  { id: string; updated_at: string }[]
> {
  const supabase = createAnonClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("listings")
    .select("id, updated_at")
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1000);
  return data ?? [];
}

export async function incrementListingView(id: string): Promise<void> {
  const supabase = createAnonClient();
  await supabase.rpc("increment_listing_view", { p_listing_id: id });
}
