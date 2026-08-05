"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { listingSchema, type ListingFormState } from "./schema";
import type { ListingStatus } from "./queries";

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

export async function createListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { status: "error", error: firstErrorKey(parsed.error.issues) };
  }
  const d = parsed.data;

  if (!(await assertAmenitiesExist(supabase, d.amenity_ids))) {
    return { status: "error", error: "amenityInvalid" };
  }

  const { error } = await supabase.rpc("create_listing", {
    p_property_id: d.property_id,
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
    // 42501 = RLS violation → the property is not the caller's.
    return {
      status: "error",
      error: error.code === "42501" ? "notOwner" : "errorGeneric",
    };
  }

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile`);
}

export async function updateListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", error: "errorGeneric" };
  }

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { status: "error", error: firstErrorKey(parsed.error.issues) };
  }
  const d = parsed.data;

  if (!(await assertAmenitiesExist(supabase, d.amenity_ids))) {
    return { status: "error", error: "amenityInvalid" };
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
    return { status: "error", error: "errorGeneric" };
  }

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile`);
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
    // PH001 = photo gate; CT001 = owner has no name/phone; 23514 = invalid
    // transition; 23505 = the one-active-per-property partial unique index.
    const key =
      error.code === "PH001"
        ? "needsPhotos"
        : error.code === "CT001"
          ? "contactRequired"
          : error.code === "23514"
            ? "invalidTransition"
            : error.code === "23505"
              ? "activeListingExists"
              : "errorGeneric";
    return { status: "error", error: key };
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
