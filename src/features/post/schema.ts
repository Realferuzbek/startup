import { makePropertySchema } from "@/features/properties/schema";
import { listingSchema } from "@/features/listings/schema";
import { profileSchema } from "@/features/profile/schema";

// The one-step post form validates EVERYTHING on the client before a single row
// is created. That is what makes a validation error incapable of leaving a
// partial record behind.
//
// It composes the three schemas that already exist rather than restating any
// rule: they are pure zod (plus the pure helpers in @/lib/phone), so they import
// into a client component unchanged, and the server re-validates with the very
// same objects. There is no second source of truth.

// Maps a field path to the message key its section's namespace already has.
export type FieldErrors = Record<string, string>;

export type PostValues = {
  // Contact — only collected when the profile is missing a name or phone.
  full_name: string;
  phone: string;
  telegram_username: string;
  // Location
  region_id: number | "";
  district_id: number | "";
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  // Details
  title: string;
  description: string;
  content_language: string;
  price_amount: string;
  price_currency: string;
  rental_period: string;
  rooms: string;
  area_sqm: string;
  floor: string;
  total_floors: string;
  available_from: string;
  amenity_ids: number[];
};

function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// A zod issue's key: the schemas already carry the right message key on every
// issue they raise (profile), or encode it by field path (property, listing).
const PROPERTY_KEY: Record<string, string> = {
  district_id: "districtRequired",
  address_line: "addressInvalid",
  latitude: "locationOutOfBounds",
  longitude: "locationOutOfBounds",
};

const LISTING_KEY: Record<string, string> = {
  title: "titleInvalid",
  description: "descriptionInvalid",
  price_amount: "priceInvalid",
  rooms: "roomsInvalid",
  area_sqm: "areaInvalid",
  floor: "floorInvalid",
  total_floors: "floorInvalid",
  available_from: "availableFromInvalid",
  amenity_ids: "amenityInvalid",
};

export function validatePost(
  values: PostValues,
  options: {
    needsContact: boolean;
    tashkentCityRegionId: number | null;
    photoCount: number;
  },
): FieldErrors {
  const errors: FieldErrors = {};

  if (options.needsContact) {
    const parsed = profileSchema.safeParse({
      full_name: values.full_name,
      phone: values.phone,
      telegram_username: values.telegram_username,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        // profileSchema puts the i18n key straight in `message`.
        if (field && !errors[field]) errors[field] = issue.message;
      }
    }
  }

  if (values.latitude === null || values.longitude === null) {
    errors.location = "locationRequired";
  }

  const property = makePropertySchema(
    options.tashkentCityRegionId ?? -1,
  ).safeParse({
    region_id: values.region_id === "" ? NaN : values.region_id,
    district_id: values.district_id === "" ? null : values.district_id,
    address_line: values.address_line,
    latitude: values.latitude ?? NaN,
    longitude: values.longitude ?? NaN,
  });
  if (!property.success) {
    for (const issue of property.error.issues) {
      const field = String(issue.path[0] ?? "");
      const key = PROPERTY_KEY[field];
      if (key && !errors[field]) errors[field] = key;
      if (!key && field === "region_id" && !errors.region_id) {
        errors.region_id = "regionRequired";
      }
    }
  }

  if (options.photoCount < 1) {
    errors.photos = "photosRequired";
  }

  const listing = listingSchema.safeParse({
    // A placeholder id: the real property may not exist yet, and property_id is
    // supplied by the orchestrator, never by the user.
    property_id: "00000000-0000-0000-0000-000000000000",
    title: values.title,
    description: values.description.trim() === "" ? null : values.description,
    content_language: values.content_language,
    price_amount: num(values.price_amount) ?? 0,
    price_currency: values.price_currency,
    rental_period: values.rental_period,
    rooms: num(values.rooms),
    area_sqm: num(values.area_sqm),
    floor: num(values.floor),
    total_floors: num(values.total_floors),
    available_from:
      values.available_from.trim() === "" ? null : values.available_from,
    amenity_ids: values.amenity_ids,
  });
  if (!listing.success) {
    for (const issue of listing.error.issues) {
      const field = String(issue.path[0] ?? "");
      const key = LISTING_KEY[field];
      if (key && !errors[field]) errors[field] = key;
    }
  }

  return errors;
}

// FormData builders — one per phase, so the server actions keep receiving the
// exact field names their existing parsers already read.
export function contactFormData(values: PostValues): FormData {
  const fd = new FormData();
  fd.set("full_name", values.full_name);
  fd.set("phone", values.phone);
  fd.set("telegram_username", values.telegram_username);
  return fd;
}

export function propertyFormData(values: PostValues, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("region_id", String(values.region_id));
  if (values.district_id !== "")
    fd.set("district_id", String(values.district_id));
  fd.set("address_line", values.address_line);
  fd.set("latitude", String(values.latitude ?? ""));
  fd.set("longitude", String(values.longitude ?? ""));
  return fd;
}

export function listingFormData(
  values: PostValues,
  propertyId: string,
  listingId?: string,
): FormData {
  const fd = new FormData();
  if (listingId) fd.set("id", listingId);
  fd.set("property_id", propertyId);
  fd.set("title", values.title);
  fd.set("description", values.description);
  fd.set("content_language", values.content_language);
  fd.set("price_amount", values.price_amount);
  fd.set("price_currency", values.price_currency);
  fd.set("rental_period", values.rental_period);
  fd.set("rooms", values.rooms);
  fd.set("area_sqm", values.area_sqm);
  fd.set("floor", values.floor);
  fd.set("total_floors", values.total_floors);
  fd.set("available_from", values.available_from);
  for (const id of values.amenity_ids) fd.append("amenity_ids", String(id));
  return fd;
}
