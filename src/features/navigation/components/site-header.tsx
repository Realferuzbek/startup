import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { LocaleSwitcher } from "@/features/discovery/components/locale-switcher";
import { HeaderNav } from "./header-nav";

// One header for the whole site — signed in or out, public page or not. Sticky,
// hairline bottom border, no shadow, no girih (its scarcity is reserved for the
// verified mark and empty states). From md up it carries the three
// destinations; below md it collapses to the wordmark and the locale switcher,
// because navigation lives in the fixed bottom bar there.
export async function SiteHeader({ locale }: { locale: string }) {
  const tc = await getTranslations("common");
  const current = await getCurrentUser();

  return (
    <header className="bg-paper border-rule sticky top-0 z-40 border-b">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link
          href="/"
          className="text-ink text-h3 rounded-sm font-semibold focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none"
        >
          {tc("appName")}
        </Link>

        <div className="flex items-center gap-6">
          <HeaderNav signedIn={Boolean(current)} />
          <LocaleSwitcher current={locale} />
        </div>
      </div>
    </header>
  );
}
