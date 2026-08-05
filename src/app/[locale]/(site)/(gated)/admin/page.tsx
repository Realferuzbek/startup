import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAdminOverview } from "@/features/verification/queries";

type Props = { params: Promise<{ locale: string }> };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-rule bg-surface flex flex-col gap-1 rounded-md border p-4">
      <span className="text-h1 text-ink font-mono">{value}</span>
      <span className="text-small text-ink-secondary">{label}</span>
    </div>
  );
}

// Admin overview: three counts. The pending-verifications count links to the
// review queue; properties and live listings are informational for now.
export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const overview = await getAdminOverview();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("overviewTitle")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("properties")} value={overview.properties} />
        <StatCard label={t("liveListings")} value={overview.liveListings} />
        <Link
          href="/admin/verifications"
          className="rounded-md focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:outline-none"
        >
          <div className="border-rule bg-surface hover:border-rule-strong flex flex-col gap-1 rounded-md border p-4 transition-colors">
            <span className="text-h1 text-registry font-mono">
              {overview.pendingVerifications}
            </span>
            <span className="text-small text-registry">
              {t("pendingVerifications")}
            </span>
          </div>
        </Link>
      </div>
    </main>
  );
}
