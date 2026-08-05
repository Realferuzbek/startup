"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
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
  if (field === "district_id") return "districtRequired";
  if (field === "address_line") return "addressInvalid";
  if (field === "latitude" || field === "longitude")
    return "locationOutOfBounds";
  return "errorGeneric";
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
    return { ok: false, error: "errorGeneric" };
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
    return { ok: false, error: "errorGeneric" };
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
    return { status: "error", error: "errorGeneric" };
  }

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile`);
}
