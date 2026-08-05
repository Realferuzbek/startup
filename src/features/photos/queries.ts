import "server-only";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type PropertyPhoto = {
  id: string;
  storage_path: string;
  display_order: number;
  url: string;
};

const PUBLIC_BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos`;

export function publicPhotoUrl(storagePath: string): string {
  return `${PUBLIC_BASE}/${storagePath}`;
}

// The caller's own property's photos (any listing state), ordered.
export async function getPropertyPhotos(
  userId: string,
  propertyId: string,
): Promise<PropertyPhoto[]> {
  const supabase = await createClient();

  const { data: owned } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!owned) return [];

  const { data } = await supabase
    .from("property_photos")
    .select("id, storage_path, display_order")
    .eq("property_id", propertyId)
    .order("display_order");

  return (data ?? []).map((p) => ({
    ...p,
    url: publicPhotoUrl(p.storage_path),
  }));
}

export async function getPhotoCounts(
  propertyIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (propertyIds.length === 0) return counts;

  const supabase = await createClient();
  const { data } = await supabase
    .from("property_photos")
    .select("property_id")
    .in("property_id", propertyIds);

  for (const row of data ?? []) {
    counts.set(row.property_id, (counts.get(row.property_id) ?? 0) + 1);
  }
  return counts;
}
