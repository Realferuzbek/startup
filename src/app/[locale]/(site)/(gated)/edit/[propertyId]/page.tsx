import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { getGeographyOptions } from "@/features/properties/queries";
import { getAmenities } from "@/features/listings/queries";
import { getPropertyPhotos } from "@/features/photos/queries";
import { PhotoManager } from "@/features/photos/components/photo-manager";
import {
  PostForm,
  type PostListingInitial,
} from "@/features/post/components/post-form";
import { currentListing } from "@/features/homes/state";

type Props = { params: Promise<{ locale: string; propertyId: string }> };

// The same single form as /post, prefilled. It also finishes an incomplete home:
// when the property has no listing yet, the submit creates and publishes one.
export default async function EditPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  // Read numeric lat/lng from the security_invoker view. RLS + the owner filter
  // ensure only the user's own property loads into the form.
  const { data: property } = await supabase
    .from("properties_with_coords")
    .select("id, region_id, district_id, address_line, latitude, longitude")
    .eq("id", propertyId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    !property ||
    property.id == null ||
    property.region_id == null ||
    property.address_line == null ||
    property.latitude == null ||
    property.longitude == null
  ) {
    notFound();
  }

  const { data: listingRows } = await supabase
    .from("listings")
    .select(
      "id, status, title, description, content_language, price_amount, price_currency, rental_period, rooms, area_sqm, floor, total_floors, available_from, expires_at, view_count, reveal_count, created_at",
    )
    .eq("property_id", property.id);

  // The property's current offer, by the same rule the homes list uses.
  const current = currentListing(
    (listingRows ?? []).map((l) => ({
      id: l.id,
      status: l.status,
      price_amount: Number(l.price_amount),
      price_currency: l.price_currency,
      rental_period: l.rental_period,
      expires_at: l.expires_at,
      view_count: l.view_count,
      reveal_count: l.reveal_count,
      created_at: l.created_at,
    })),
  );
  const row = current
    ? (listingRows ?? []).find((l) => l.id === current.id)
    : undefined;

  const [geo, amenities, photos] = await Promise.all([
    getGeographyOptions(),
    getAmenities(),
    getPropertyPhotos(user.id, property.id),
  ]);

  let amenityIds: number[] = [];
  if (row) {
    const { data: joins } = await supabase
      .from("listing_amenities")
      .select("amenity_id")
      .eq("listing_id", row.id);
    amenityIds = (joins ?? []).map((j) => j.amenity_id);
  }

  const listing: PostListingInitial | null = row
    ? {
        id: row.id,
        title: row.title,
        description: row.description,
        content_language: row.content_language,
        price_amount: Number(row.price_amount),
        price_currency: row.price_currency,
        rental_period: row.rental_period,
        rooms: row.rooms,
        area_sqm: row.area_sqm !== null ? Number(row.area_sqm) : null,
        floor: row.floor,
        total_floors: row.total_floors,
        available_from: row.available_from,
      }
    : null;

  const t = await getTranslations("post");
  const needsContact = !profile?.full_name?.trim() || !profile?.phone;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("editTitle")}</h1>
      <PostForm
        mode="edit"
        locale={locale}
        regions={geo.regions}
        districts={geo.districts}
        tashkentCityRegionId={geo.tashkentCityRegionId}
        amenities={amenities}
        needsContact={needsContact}
        contact={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          telegram_username: profile?.telegram_username ?? "",
        }}
        initial={{
          propertyId: property.id,
          region_id: property.region_id,
          district_id: property.district_id,
          address_line: property.address_line,
          latitude: property.latitude,
          longitude: property.longitude,
          listing,
          amenityIds,
        }}
        existingPhotoCount={photos.length}
        photoSlot={<PhotoManager propertyId={property.id} photos={photos} />}
      />
    </main>
  );
}
