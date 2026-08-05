"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logActionError } from "@/lib/log";
import { requireUser } from "@/features/auth/session";
import { makePropertySchema, type PropertyFormState } from "./schema";

// Result of the non-redirecting actions the one-step post form drives. The
// `useActionState`-shaped `deleteProperty` below keeps PropertyFormState.
export type PropertyResult =
  { ok: true; id: string } | { ok: false; error: string };

// Maps the first Zod issue to an i18n key under the `property` namespace.
function firstErrorKey(issues: z.core.$ZodIssue[]): string {
  const issue = issues[0];
  const field = issue?.path[0];
  if (field === "region_id") return "regionRequired";
  if (field === "district_id") return "districtRequired";
  if (field === "address_line") return "addressInvalid";
  if (field === "latitude" || field === "longitude")
    return "locationOutOfBounds";
  return "errorGeneric";
}

// Every way the database can refuse a property write, named. Without this each
// one arrived as `errorGeneric`, which is why a posting failure could not be
// told apart from any other failure.
//   DR001 = the district does not belong to the region (integrity trigger)
//   23514 = the only remaining CHECK on properties: coordinates out of bounds
//   23503 = foreign key: the region or district id does not exist
//   23502 = not-null: owner_id absent, i.e. the RPC ran without a session
//   42501 = RLS refused the row (the property is not the caller's)
function mapPropertyDbError(code: string | undefined): string {
  switch (code) {
    case "DR001":
      return "districtRegionMismatch";
    case "23514":
      return "locationOutOfBounds";
    case "23503":
      return "regionInvalid";
    case "23502":
    case "42501":
      return "notOwner";
    default:
      return "errorGeneric";
  }
}

async function tashkentCityRegionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  const { data } = await supabase
    .from("regions")
    .select("id")
    .eq("slug", "tashkent-city")
    .maybeSingle();
  // -1 can never match a real region id, so the district-required refinement
  // simply never triggers if the lookup somehow fails.
  return data?.id ?? -1;
}

// Reads and coordinates the shared, validated fields from the submitted form.
// Returns either parsed data or an error key.
function parseFields(formData: FormData, tashkentCityId: number) {
  const latRaw = formData.get("latitude");
  const lngRaw = formData.get("longitude");
  if (
    typeof latRaw !== "string" ||
    latRaw === "" ||
    typeof lngRaw !== "string" ||
    lngRaw === ""
  ) {
    return { ok: false as const, error: "locationRequired" };
  }

  const districtRaw = formData.get("district_id");
  const parsed = makePropertySchema(tashkentCityId).safeParse({
    region_id: Number(formData.get("region_id")),
    district_id:
      typeof districtRaw === "string" && districtRaw !== ""
        ? Number(districtRaw)
        : null,
    address_line: String(formData.get("address_line") ?? ""),
    latitude: Number(latRaw),
    longitude: Number(lngRaw),
  });

  if (!parsed.success) {
    return { ok: false as const, error: firstErrorKey(parsed.error.issues) };
  }
  return { ok: true as const, data: parsed.data };
}

// Phase 2 of the one-step post. Same validation and the same create_property
// RPC as ever, but it RETURNS the new id instead of redirecting: the client
// needs it for the photo storage paths and for the listing that follows.
// (create_property has always been `returns uuid`; the old action discarded it.)
export async function createPostProperty(
  formData: FormData,
): Promise<PropertyResult> {
  await requireUser();
  const supabase = await createClient();

  const result = parseFields(formData, await tashkentCityRegionId(supabase));
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const { data, error } = await supabase.rpc("create_property", {
    p_region_id: result.data.region_id,
    // The SQL param is nullable (a property outside Tashkent city has no
    // district); the generated type under-describes it as non-null.
    p_district_id: result.data.district_id as number,
    p_address_line: result.data.address_line,
    p_latitude: result.data.latitude,
    p_longitude: result.data.longitude,
  });
  if (error || !data) {
    // The shape of the input, never its content: enough to reproduce the
    // rejection without putting an address or a pin in a log.
    logActionError("properties.create/rpc", error, {
      region_id: result.data.region_id,
      has_district: result.data.district_id !== null,
      returned_id: Boolean(data),
    });
    return { ok: false, error: mapPropertyDbError(error?.code) };
  }

  return { ok: true, id: data };
}

// The edit-form counterpart: updates the property's fields and returns, leaving
// the caller to continue with the listing half of the same submit.
export async function updatePostProperty(
  formData: FormData,
): Promise<PropertyResult> {
  await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { ok: false, error: "errorGeneric" };
  }

  const result = parseFields(formData, await tashkentCityRegionId(supabase));
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const { error } = await supabase.rpc("update_property", {
    p_id: id.data,
    p_region_id: result.data.region_id,
    // Nullable in SQL; see note in createPostProperty.
    p_district_id: result.data.district_id as number,
    p_address_line: result.data.address_line,
    p_latitude: result.data.latitude,
    p_longitude: result.data.longitude,
  });
  if (error) {
    logActionError("properties.update/rpc", error, {
      property_id: id.data,
      region_id: result.data.region_id,
      has_district: result.data.district_id !== null,
    });
    // update_property raises no_data_found (P0002) when the row is not the
    // caller's — RLS narrowed the UPDATE to zero rows.
    return {
      ok: false,
      error:
        error.code === "P0002" ? "notOwner" : mapPropertyDbError(error.code),
    };
  }

  revalidatePath(`/${locale}/profile`);
  return { ok: true, id: id.data };
}

export async function deleteProperty(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", error: "errorGeneric" };
  }

  // Refuse to delete a property that still has listings — never cascade-delete
  // them. (A database BEFORE DELETE trigger enforces this as well.)
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id.data);
  if ((count ?? 0) > 0) {
    return { status: "error", error: "deleteBlocked" };
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id.data);
  if (error) {
    logActionError("properties.delete", error, { property_id: id.data });
    // 23503 = the BEFORE DELETE guard: the property still has listings.
    return {
      status: "error",
      error: error.code === "23503" ? "deleteBlocked" : "errorGeneric",
    };
  }

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile`);
}
