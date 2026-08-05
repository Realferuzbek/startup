import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getGeographyOptions } from "@/features/properties/queries";
import { publicPhotoUrl } from "@/features/photos/queries";
import {
  currentListing,
  deriveHomeState,
  type HomeListing,
  type HomeState,
} from "./state";

export type Home = {
  propertyId: string;
  addressLine: string;
  regionName: string;
  districtName: string | null;
  verificationStatus: string;
  rejectionReason: string | null;
  photoCount: number;
  coverUrl: string | null;
  listing: HomeListing | null;
  state: HomeState;
};

// Every home the caller owns, with everything a card needs, in one embedded
// query (property + its listings + its photos) plus the shared geography
// reference data — no N+1. RLS (the owner policies on properties/listings/
// property_photos) is the boundary; this runs on the session client.
export async function getOwnerHomes(
  userId: string,
  locale: string,
): Promise<Home[]> {
  const supabase = await createClient();
  const [{ data }, geo] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, address_line, verification_status, region_id, district_id, listings(id, status, price_amount, price_currency, rental_period, expires_at, view_count, reveal_count, created_at), property_photos(storage_path, display_order), property_verifications(status, rejection_reason, created_at)",
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    getGeographyOptions(),
  ]);

  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;
  const regionName = (id: number | null) => {
    const r = geo.regions.find((x) => x.id === id);
    return r ? label(r) : "";
  };
  const districtName = (id: number | null) => {
    if (id == null) return null;
    const d = geo.districts.find((x) => x.id === id);
    return d ? label(d) : null;
  };

  return (data ?? []).map((p) => {
    const photos = [...(p.property_photos ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    );
    const listings: HomeListing[] = (p.listings ?? []).map((l) => ({
      id: l.id,
      status: l.status,
      price_amount: Number(l.price_amount),
      price_currency: l.price_currency,
      rental_period: l.rental_period,
      expires_at: l.expires_at,
      view_count: l.view_count,
      reveal_count: l.reveal_count,
      created_at: l.created_at,
    }));
    const listing = currentListing(listings);

    // The reason to show only when the property is currently rejected — the
    // latest rejected submission's reason.
    const rejectionReason =
      p.verification_status === "rejected"
        ? ((p.property_verifications ?? [])
            .filter((v) => v.status === "rejected")
            .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
            ?.rejection_reason ?? null)
        : null;

    return {
      propertyId: p.id,
      addressLine: p.address_line,
      regionName: regionName(p.region_id),
      districtName: districtName(p.district_id),
      verificationStatus: p.verification_status,
      rejectionReason,
      photoCount: photos.length,
      coverUrl: photos[0] ? publicPhotoUrl(photos[0].storage_path) : null,
      listing,
      state: deriveHomeState(listing),
    };
  });
}
