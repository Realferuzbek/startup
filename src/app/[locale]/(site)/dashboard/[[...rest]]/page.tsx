import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

// The dashboard concept is gone: everything it held now lives on /profile. One
// optional catch-all so every old path redirects, not just the ones that had a
// page — /dashboard, /dashboard/favorites, /dashboard/profile,
// /dashboard/properties[/new|/:id/edit], /dashboard/listings[/new|/:id/edit],
// and /dashboard/homes/:id/verify.
export default async function LegacyDashboardPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/profile`);
}
