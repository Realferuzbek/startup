import { z } from "zod";

// The host submission form state. `error` is an i18n key under the
// `verification` namespace; a field-specific key highlights that field.
export type SubmitState = {
  status: "idle" | "error";
  error?: string;
};

// The admin decision form state (surfaced inline on the detail page).
export type DecideState = {
  status: "idle" | "error";
  error?: string;
};

// Cadastral numbers vary in format across cadastre extracts, so this only
// bounds length and trims — the human reviewer confirms it against the document.
export const submitVerificationSchema = z.object({
  property_id: z.uuid(),
  cadastral_number: z
    .string()
    .trim()
    .min(5, { message: "cadastralInvalid" })
    .max(50, { message: "cadastralInvalid" }),
});
