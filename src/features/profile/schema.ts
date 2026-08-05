import { z } from "zod";
import { normalizeUzPhone, normalizeTelegram } from "@/lib/phone";

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  error?: string;
};

// The `message` on each rule is the i18n key surfaced next to the field. Phone
// is normalized to canonical +998… on the way in; telegram is stored without @.
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: "fullNameInvalid" })
    .max(100, { message: "fullNameInvalid" }),
  phone: z
    .string()
    .refine((v) => normalizeUzPhone(v) !== null, { message: "phoneInvalid" })
    .transform((v) => normalizeUzPhone(v)!),
  telegram_username: z
    .string()
    .transform((v) => normalizeTelegram(v))
    .refine((v) => v === "" || /^[A-Za-z0-9_]{5,32}$/.test(v), {
      message: "telegramInvalid",
    })
    .transform((v) => (v === "" ? null : v)),
});
