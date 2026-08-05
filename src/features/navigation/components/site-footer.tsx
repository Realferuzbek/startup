import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/features/discovery/components/locale-switcher";

// Quiet site footer: hairline top border, no shadow, no girih. The wordmark, a
// short line about the site, and the locale switcher. It carries no navigation
// of its own — the three destinations are the header and the bottom bar.
export async function SiteFooter({ locale }: { locale: string }) {
  const tc = await getTranslations("common");
  const th = await getTranslations("home");
  const year = new Date().getFullYear();

  return (
    <footer className="border-rule bg-paper border-t">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-10 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-ink text-h3 font-semibold">
              {tc("appName")}
            </span>
            <p className="text-small text-ink-secondary max-w-sm">
              {th("footerTagline")}
            </p>
          </div>
          <LocaleSwitcher current={locale} />
        </div>
        <div className="border-rule border-t pt-4">
          <p className="text-caption text-ink-muted">
            © {year} {tc("appName")}
          </p>
        </div>
      </div>
    </footer>
  );
}
