import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getVerificationQueue } from "@/features/verification/queries";
import { EmptyState } from "@/components/ui/empty-state";

type Props = { params: Promise<{ locale: string }> };

// The pending-verification review queue, oldest first.
export default async function VerificationQueuePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const queue = await getVerificationQueue(locale);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="text-small text-ink-secondary hover:text-registry"
        >
          ← {t("overviewTitle")}
        </Link>
      </div>
      <h1 className="text-h1 text-ink mb-6">{t("queueTitle")}</h1>

      {queue.length === 0 ? (
        <EmptyState heading={t("empty")} body={t("emptyBody")} />
      ) : (
        <ul className="border-rule bg-surface divide-rule divide-y rounded-md border">
          {queue.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/verifications/${item.id}`}
                className="hover:bg-registry-soft flex flex-col gap-1 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-body text-ink font-medium">
                    {item.addressLine}
                  </span>
                  <span className="text-small text-ink-secondary">
                    {item.districtName ? `${item.districtName} — ` : ""}
                    {item.regionName}
                    {item.hostName ? ` · ${item.hostName}` : ""}
                  </span>
                </div>
                <span className="text-caption text-ink-muted font-mono">
                  {item.createdAt.slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
