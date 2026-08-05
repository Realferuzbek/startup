"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { listingSchema, type ListingFormState } from "./schema";
import type { ListingStatus } from "./queries";

// Result of the non-redirecting actions the one-step post form drives.
export type ListingResult =
  { ok: true; id: string } | { ok: false; error: string };

// Every way the database can refuse to make a listing live, in one table, so the
// born-active insert and the status transitions below can never drift apart.
// PH001 = no property photo; CT001 = owner has no name/phone; 23514 = invalid
// status transition; 23505 = the one-active-listing-per-property index;
// 42501 = RLS violation, i.e. the property is not the caller's.
function mapListingError(code: string | undefined): string {
  switch (code) {
    case "PH001":
      return "needsPhotos";
    case "CT001":
      return "contactRequired";
    case "23514":
      return "invalidTransition";
    case "23505":
      return "activeListingExists";
    case "42501":
      return "notOwner";
    default:
      return "errorGeneric";
  }
}

// Maps the first Zod issue to an i18n key under the `listing` namespace.
function firstErrorKey(issues: z.core.$ZodIssue[]): string {
  const field = issues[0]?.path[0];
  switch (field) {
    case "title":
      return "titleInvalid";
    case "description":
      return "descriptionInvalid";
    case "price_amount":
      return "priceInvalid";
    case "rooms":
      return "roomsInvalid";
    case "area_sqm":
      return "areaInvalid";
    case "floor":
    case "total_floors":
      return "floorInvalid";
    case "available_from":
      return "availableFromInvalid";
    case "amenity_ids":
      return "amenityInvalid";
    default:
      return "errorGeneric";
  }
}

function num(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function text(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function parseListing(formData: FormData) {
  return listingSchema.safeParse({
    property_id: String(formData.get("property_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: text(formData.get("description")),
    content_language: String(formData.get("content_language") ?? ""),
    price_amount: num(formData.get("price_amount")) ?? 0,
    price_currency: String(formData.get("price_currency") ?? "UZS"),
    rental_period: String(formData.get("rental_period") ?? "monthly"),
    rooms: num(formData.get("rooms")),
    area_sqm: num(formData.get("area_sqm")),
    floor: num(formData.get("floor")),
    total_floors: num(formData.get("total_floors")),
    available_from: text(formData.get("available_from")),
    amenity_ids: formData
      .getAll("amenity_ids")
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n)),
  });
}

async function assertAmenitiesExist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  amenityIds: number[],
): Promise<boolean> {
  if (amenityIds.length === 0) return true;
  const { data } = await supabase
    .from("amenities")
    .select("id")
    .in("id", amenityIds);
  const valid = new Set((data ?? []).map((a) => a.id));
  return amenityIds.every((id) => valid.has(id));
}

// Phase 4 of the one-step post: create the listing ALREADY ACTIVE.
//
// enforce_listing_lifecycle's INSERT branch runs the same PH001 (>=1 photo) and
// CT001 (owner name + phone) gates as a publish, and backfills expires_at — so a
// listing can be born active. The alternative, create_listing (which can only
// produce a draft) followed by a status update, opens a window where a draft row
// exists: if that update then failed, the draft would make the property
// permanently undeletable, since deleteProperty refuses on ANY listing history.
// Born-active has no such window — it either succeeds or creates nothing.
//
// The cost is inserting listing_amenities separately (create_listing did that in
// the same transaction). If only that second statement fails the listing is live
// but untagged, which the edit form fixes — strictly better than never going live.
export async function publishNewListing(
  formData: FormData,
): Promise<ListingResult> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { ok: false, error: firstErrorKey(parsed.error.issues) };
  }
  const d = parsed.data;

  if (!(await assertAmenitiesExist(supabase, d.amenity_ids))) {
    return { ok: false, error: "amenityInvalid" };
  }

  // owner_id is the session's user so the row satisfies the RLS WITH CHECK.
  // It is not authoritative: the set_listing_owner BEFORE trigger overwrites it
  // from properties.owner_id, so a forged value cannot claim someone's property.
  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      property_id: d.property_id,
      title: d.title,
      description: d.description,
      content_language: d.content_language,
      price_amount: d.price_amount,
      price_currency: d.price_currency,
      rental_period: d.rental_period,
      rooms: d.rooms,
      area_sqm: d.area_sqm,
      floor: d.floor,
      total_floors: d.total_floors,
      available_from: d.available_from,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: mapListingError(error?.code) };
  }

  if (d.amenity_ids.length > 0) {
    await supabase.from("listing_amenities").insert(
      d.amenity_ids.map((amenity_id) => ({
        listing_id: data.id,
        amenity_id,
      })),
    );
  }

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}`);
  return { ok: true, id: data.id };
}

// The edit-form counterpart. Updates the listing's fields via the existing RPC,
// then makes sure it is live: a legacy `draft` row (from before one-step posting)
// is moved to active here, which is what "finish an incomplete home" does.
export async function updatePostListing(
  formData: FormData,
): Promise<ListingResult> {
  await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { ok: false, error: "errorGeneric" };
  }

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { ok: false, error: firstErrorKey(parsed.error.issues) };
  }
  const d = parsed.data;

  if (!(await assertAmenitiesExist(supabase, d.amenity_ids))) {
    return { ok: false, error: "amenityInvalid" };
  }

  const { error } = await supabase.rpc("update_listing", {
    p_id: id.data,
    p_title: d.title,
    p_content_language: d.content_language,
    p_price_amount: d.price_amount,
    p_description: d.description ?? undefined,
    p_price_currency: d.price_currency,
    p_rental_period: d.rental_period,
    p_rooms: d.rooms ?? undefined,
    p_area_sqm: d.area_sqm ?? undefined,
    p_floor: d.floor ?? undefined,
    p_total_floors: d.total_floors ?? undefined,
    p_available_from: d.available_from ?? undefined,
    p_amenity_ids: d.amenity_ids,
  });
  if (error) {
    return { ok: false, error: "errorGeneric" };
  }

  const { data: row } = await supabase
    .from("listings")
    .select("status")
    .eq("id", id.data)
    .maybeSingle();

  if (row?.status === "draft") {
    const { error: publishError } = await supabase
      .from("listings")
      .update({ status: "active" })
      .eq("id", id.data);
    if (publishError) {
      return { ok: false, error: mapListingError(publishError.code) };
    }
  }

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}`);
  return { ok: true, id: id.data };
}

// Status changes go ONLY through these dedicated actions — never a form field.
// The DB transition trigger is the authority; the UI only offers valid moves.
async function changeStatus(
  formData: FormData,
  status: ListingStatus,
): Promise<ListingFormState> {
  await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", error: "errorGeneric" };
  }

  const { data, error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", id.data)
    .select("id");
  if (error) {
    return { status: "error", error: mapListingError(error.code) };
  }
  if (!data || data.length === 0) {
    return { status: "error", error: "notFound" };
  }

  // The "Uylarim" section of /profile is the live surface for these
  // transitions; the feed reflects them too, since publishing and pausing
  // change what the public sees.
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}`);
  return { status: "idle" };
}

export async function publishListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  return changeStatus(formData, "active");
}

export async function pauseListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  return changeStatus(formData, "paused");
}

export async function removeListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  return changeStatus(formData, "removed");
}
