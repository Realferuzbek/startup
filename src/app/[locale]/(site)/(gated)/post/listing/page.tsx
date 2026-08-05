import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

// Posting is one page now — the separate "create a listing against an existing
// property" step is gone.
export default async function LegacyPostListingPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/post`);
}
