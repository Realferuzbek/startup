import { z } from "zod";

// Approximate bounding box of Uzbekistan. Mirrors the database CHECK
// constraint (properties_location_bounds).
const LAT_MIN = 37.0;
const LAT_MAX = 46.0;
const LNG_MIN = 55.0;
const LNG_MAX = 74.0;

// `error` is an i18n key suffix under the `property` namespace.
export type PropertyFormState = {
  status: "idle" | "error";
  error?: string;
};

// The schema depends on which region is Tashkent city, because a district is
// REQUIRED there and optional (in fact absent) everywhere else.
export function makePropertySchema(tashkentCityRegionId: number) {
  return z
    .object({
      region_id: z.number().int().positive(),
      district_id: z.number().int().positive().nullable(),
      address_line: z.string().trim().min(3).max(200),
      latitude: z.number().min(LAT_MIN).max(LAT_MAX),
      longitude: z.number().min(LNG_MIN).max(LNG_MAX),
    })
    .refine(
      (data) =>
        !(data.region_id === tashkentCityRegionId && data.district_id === null),
      { path: ["district_id"], message: "districtRequired" },
    );
}

export type PropertyInput = z.infer<ReturnType<typeof makePropertySchema>>;
