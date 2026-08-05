import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RegionOption = {
  id: number;
  slug: string;
  name_uz: string;
  name_ru: string;
};

export type DistrictOption = {
  id: number;
  region_id: number;
  name_uz: string;
  name_ru: string;
};

// Loads the region/district options for the property form and lists, plus the
// id of the Tashkent-city region (which is the only one that has districts).
export async function getGeographyOptions(): Promise<{
  regions: RegionOption[];
  districts: DistrictOption[];
  tashkentCityRegionId: number | null;
}> {
  const supabase = await createClient();
  const [regionsRes, districtsRes] = await Promise.all([
    supabase
      .from("regions")
      .select("id, slug, name_uz, name_ru")
      .order("sort_order"),
    supabase
      .from("districts")
      .select("id, region_id, name_uz, name_ru")
      .order("sort_order"),
  ]);

  const regions = regionsRes.data ?? [];
  const districts = districtsRes.data ?? [];
  const tashkentCityRegionId =
    regions.find((r) => r.slug === "tashkent-city")?.id ?? null;

  return { regions, districts, tashkentCityRegionId };
}
