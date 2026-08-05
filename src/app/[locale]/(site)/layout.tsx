import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/session";
import { SiteHeader } from "@/features/navigation/components/site-header";
import { SiteFooter } from "@/features/navigation/components/site-footer";
import { BottomNav } from "@/features/navigation/components/bottom-nav";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// The chrome for every page. Navigation is defined once here so it is literally
// identical signed in and signed out, public page or authenticated one.
//
// The bottom bar is `fixed`, so it occupies no space in flow. The padding below
// reserves exactly its height (3.5rem) plus the iOS home-indicator inset, which
// is what keeps the footer and the last row of cards scrollable clear of it.
// From md up the bar is hidden and the padding goes away with it.
export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;
  const current = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <div className="flex-1">{children}</div>
      <SiteFooter locale={locale} />
      <div
        aria-hidden="true"
        className="h-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden"
      />
      <BottomNav signedIn={Boolean(current)} />
    </div>
  );
}
