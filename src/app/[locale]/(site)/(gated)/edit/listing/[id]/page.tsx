import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";

type Props = { params: Promise<{ locale: string; id: string }> };

// Editing is keyed by property now. Resolve the old listing-keyed URL to its
// property — owner-scoped, so a non-owner gets a 404 rather than a hint that the
// listing exists.
export default async function LegacyEditListingPage({ params }: Props) {
  const { locale, id } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("listings")
    .select("property_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) notFound();
  redirect(`/${locale}/edit/${data.property_id}`);
}
