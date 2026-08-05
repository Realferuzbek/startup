"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/session";
import type { OwnerContact } from "./queries";

export type RevealState =
  | { status: "idle" }
  | { status: "revealed"; contact: OwnerContact }
  | { status: "error"; error: string };

// Reveals the owner's contact for a listing via the SECURITY DEFINER RPC (dedup
// + 24h rate-limit + reveal_count). The phone never reaches this app layer until
// the RPC returns it, so it is never in the pre-reveal page payload.
export async function revealContact(
  _prev: RevealState,
  formData: FormData,
): Promise<RevealState> {
  const current = await getCurrentUser();
  if (!current) return { status: "error", error: "errorGeneric" };

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", error: "errorGeneric" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_contact", {
    p_listing_id: id.data,
  });
  if (error) {
    // CR001 = rate limit; P0002 (no_data_found) = listing no longer visible.
    const key =
      error.code === "CR001"
        ? "rateLimited"
        : error.code === "P0002"
          ? "unavailable"
          : "errorGeneric";
    return { status: "error", error: key };
  }

  const contact = data?.[0];
  if (!contact) return { status: "error", error: "errorGeneric" };

  const locale = await getLocale();
  revalidatePath(`/${locale}/listings/${id.data}`);
  return { status: "revealed", contact };
}
