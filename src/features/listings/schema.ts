import { z } from "zod";

// `error` is an i18n key suffix under the `listing` namespace.
export type ListingFormState = {
  status: "idle" | "error";
  error?: string;
};

export const listingSchema = z
  .object({
    property_id: z.uuid(),
    title: z.string().trim().min(10).max(120),
    description: z.string().trim().max(3000).nullable().optional(),
    content_language: z.enum(["uz", "ru"]),
    price_amount: z.number().positive(), // currency-aware ceiling enforced below
    price_currency: z.enum(["UZS", "USD"]),
    rental_period: z.enum(["monthly", "daily"]),
    rooms: z.number().int().min(1).max(20).nullable().optional(),
    area_sqm: z.number().positive().max(9999.99).nullable().optional(),
    floor: z.number().int().min(-5).max(200).nullable().optional(),
    total_floors: z.number().int().min(1).max(200).nullable().optional(),
    available_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    amenity_ids: z.array(z.number().int().positive()),
  })
  .refine(
    // Currency-aware ceiling (mirrors the DB CHECK): UZS ≤ 1e9, USD ≤ 1e6.
    (d) =>
      d.price_amount <=
      (d.price_currency === "USD" ? 1_000_000 : 1_000_000_000),
    { path: ["price_amount"], message: "priceInvalid" },
  )
  .refine(
    (d) =>
      d.floor == null || d.total_floors == null || d.floor <= d.total_floors,
    { path: ["floor"], message: "floorInvalid" },
  )
  .refine(
    (d) => {
      if (!d.available_from) return true;
      const t = Date.parse(d.available_from);
      if (Number.isNaN(t)) return false;
      const max = new Date();
      max.setFullYear(max.getFullYear() + 1);
      return t <= max.getTime();
    },
    { path: ["available_from"], message: "availableFromInvalid" },
  );

export type ListingInput = z.infer<typeof listingSchema>;
