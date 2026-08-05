// A home's derived state — computed in exactly one place and reused by the
// homes list, its cards, and their actions. The two-table model (a durable
// property + time-bound listings) stays underneath; a host only ever sees one
// home with a state.

// Posting goes straight to `active`, so nothing here ever produces a draft any
// more. `incomplete` is the residue: a property whose posting run stopped before
// its listing was created, plus any legacy `draft` row. It is never called a
// draft in the UI — it is simply unfinished.
export type HomeState = "incomplete" | "live" | "paused" | "expired";

export type HomeListing = {
  id: string;
  status: string;
  price_amount: number;
  price_currency: string;
  rental_period: "monthly" | "daily";
  expires_at: string | null;
  view_count: number;
  reveal_count: number;
  created_at: string;
};

// The listing that represents a property's current offer: the active one if
// present, else the newest non-removed. null → the home has no offer yet.
export function currentListing(listings: HomeListing[]): HomeListing | null {
  const candidates = listings.filter((l) => l.status !== "removed");
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return b.created_at.localeCompare(a.created_at);
  });
  return candidates[0]!;
}

// The single source of derived state.
export function deriveHomeState(listing: HomeListing | null): HomeState {
  // A legacy `draft` row still reads as incomplete — the enum value survives in
  // the database, it is just never written any more.
  if (!listing || listing.status === "draft") return "incomplete";
  if (listing.status === "paused") return "paused";
  if (listing.status === "expired") return "expired";
  if (listing.status === "active") {
    // A time-expired active listing is "expired" even before the daily cron
    // flips its status — this matches the public time-filter.
    if (
      listing.expires_at &&
      new Date(listing.expires_at).getTime() <= Date.now()
    ) {
      return "expired";
    }
    return "live";
  }
  return "incomplete";
}
