"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { sniffImageType, extForMime } from "./magic-bytes";
import { computePhash } from "./phash";

const BUCKET = "property-photos";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard server-side limit
const MAX_PHOTOS = 15;

export type PhotoActionResult = { ok: boolean; error?: string };

async function ownsProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("owner_id", userId)
    .maybeSingle();
  return Boolean(data);
}

// THE upload security boundary. Accepts ONE image and re-validates everything
// server-side, regardless of what the client did. Uses the caller's session so
// Storage RLS authorizes the write — the service role is never involved.
export async function uploadPropertyPhoto(
  formData: FormData,
): Promise<PhotoActionResult> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const propertyId = z.uuid().safeParse(formData.get("property_id"));
  if (!propertyId.success) return { ok: false, error: "uploadFailed" };

  // 1. Ownership (also enforced by Storage RLS; this gives a clean error).
  if (!(await ownsProperty(supabase, user.id, propertyId.data))) {
    return { ok: false, error: "uploadFailed" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "uploadFailed" };
  const bytes = new Uint8Array(await file.arrayBuffer());

  // 2. Hard byte-size limit.
  if (bytes.byteLength === 0) return { ok: false, error: "uploadFailed" };
  if (bytes.byteLength > MAX_BYTES) return { ok: false, error: "fileTooLarge" };

  // 3. Magic-byte validation — trust the bytes, not the extension/MIME.
  const mime = sniffImageType(bytes);
  if (!mime) return { ok: false, error: "wrongFileType" };

  // 4. Max photos per property.
  const { count } = await supabase
    .from("property_photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId.data);
  if ((count ?? 0) >= MAX_PHOTOS) return { ok: false, error: "tooManyPhotos" };

  // 5. UUID filename — the client-supplied name is never used.
  const path = `${propertyId.data}/${randomUUID()}.${extForMime(mime)}`;

  // 6. Perceptual hash (null if unavailable — never fabricated).
  const phash = await computePhash(bytes);

  // 7. Upload with the caller's session (Storage RLS applies), then insert row.
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), { contentType: mime, upsert: false });
  if (uploadError) return { ok: false, error: "uploadFailed" };

  const { data: maxRow } = await supabase
    .from("property_photos")
    .select("display_order")
    .eq("property_id", propertyId.data)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.display_order ?? -1) + 1;

  const { error: insertError } = await supabase.from("property_photos").insert({
    property_id: propertyId.data,
    storage_path: path,
    phash,
    display_order: nextOrder,
  });

  // 8. Partial-failure cleanup: object uploaded but row failed → remove object
  //    so no orphan is left behind.
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: "uploadFailed" };
  }

  revalidatePath(`/${locale}/edit/${propertyId.data}`);
  revalidatePath(`/${locale}/profile`);
  return { ok: true };
}

// Delete a photo: DB row FIRST, then the storage object. A failed object delete
// leaves at most an orphan object (harmless in a public, UUID-pathed bucket) but
// never a dangling row / broken image; a failed row delete leaves the object
// untouched (still consistent).
export async function deletePropertyPhoto(
  photoId: string,
): Promise<PhotoActionResult> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const id = z.uuid().safeParse(photoId);
  if (!id.success) return { ok: false, error: "uploadFailed" };

  const { data: photo } = await supabase
    .from("property_photos")
    .select("id, storage_path, property_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!photo) return { ok: false, error: "uploadFailed" };
  if (!(await ownsProperty(supabase, user.id, photo.property_id))) {
    return { ok: false, error: "uploadFailed" };
  }

  const { error: rowError, count } = await supabase
    .from("property_photos")
    .delete({ count: "exact" })
    .eq("id", id.data);
  if (rowError) {
    // PH002 = the last photo of a property with an active listing.
    return {
      ok: false,
      error: rowError.code === "PH002" ? "lastPhotoActive" : "uploadFailed",
    };
  }
  if (!count) return { ok: false, error: "uploadFailed" };

  await supabase.storage.from(BUCKET).remove([photo.storage_path]);

  revalidatePath(`/${locale}/edit/${photo.property_id}`);
  revalidatePath(`/${locale}/profile`);
  return { ok: true };
}

// Reorder (used by move-up / move-down / set-cover): display_order becomes each
// id's index in the supplied array. RLS scopes the change to the owner.
export async function reorderPropertyPhotos(
  propertyId: string,
  photoIds: string[],
): Promise<PhotoActionResult> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const parsed = z
    .object({ propertyId: z.uuid(), photoIds: z.array(z.uuid()).min(1) })
    .safeParse({ propertyId, photoIds });
  if (!parsed.success) return { ok: false, error: "uploadFailed" };

  if (!(await ownsProperty(supabase, user.id, parsed.data.propertyId))) {
    return { ok: false, error: "uploadFailed" };
  }

  const { error } = await supabase.rpc("reorder_property_photos", {
    p_property_id: parsed.data.propertyId,
    p_photo_ids: parsed.data.photoIds,
  });
  if (error) return { ok: false, error: "uploadFailed" };

  revalidatePath(`/${locale}/edit/${parsed.data.propertyId}`);
  revalidatePath(`/${locale}/profile`);
  return { ok: true };
}
