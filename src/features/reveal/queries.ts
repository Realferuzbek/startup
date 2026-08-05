import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OwnerContact = {
  full_name: string | null;
  phone: string | null;
  telegram_username: string | null;
};

// The owner's contact for a listing the CALLER has ALREADY revealed, else null.
// Read-only (writes no reveal row) — lets the detail page server-render the
// contact for a returning revealer without leaking it to anyone else.
export async function getRevealedContact(
  listingId: string,
): Promise<OwnerContact | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_revealed_contact", {
    p_listing_id: listingId,
  });
  return data?.[0] ?? null;
}
