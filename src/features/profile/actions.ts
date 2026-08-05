"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { profileSchema, type ProfileFormState } from "./schema";

// Update the caller's own profile (RLS: profiles_update_own). Phone is stored in
// canonical +998… form; a duplicate phone (UNIQUE) surfaces as `phoneTaken`.
export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const parsed = profileSchema.safeParse({
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    telegram_username: String(formData.get("telegram_username") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "errorGeneric",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      telegram_username: parsed.data.telegram_username,
    })
    .eq("id", user.id);
  if (error) {
    return {
      status: "error",
      error: error.code === "23505" ? "phoneTaken" : "errorGeneric",
    };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/profile`);
  return { status: "saved" };
}
