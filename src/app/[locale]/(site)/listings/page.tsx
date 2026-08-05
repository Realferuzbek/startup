import { redirect } from "next/navigation";
import type { RawSearchParams } from "@/features/discovery/search-params";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

// /listings merged into the feed at the locale root. Every filter parameter is
// carried across verbatim — repeated keys (amenity) included — so an existing
// bookmark or shared search keeps returning the same results.
// /listings/[id] is a sibling segment and is unaffected.
export default async function LegacyListingsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const raw = await searchParams;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      for (const v of value) query.append(key, v);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  const qs = query.toString();
  redirect(`/${locale}${qs ? `?${qs}` : ""}`);
}
