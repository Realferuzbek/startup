import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { getGeographyOptions } from "@/features/properties/queries";
import { VerifyForm } from "@/features/verification/components/verify-form";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function VerifyPropertyPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await requireUser();
  const supabase = await createClient();

  // Owner-only: the owner filter + RLS mean a non-owner (or unknown id) loads
  // nothing → 404, never a hint that the property exists.
  const { data: property } = await supabase
    .from("properties")
    .select("id, address_line, region_id, district_id, verification_status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!property) notFound();

  const t = await getTranslations("verification");
  const geo = await getGeographyOptions();
  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;
  const region = geo.regions.find((r) => r.id === property.region_id);
  const district = geo.districts.find((d) => d.id === property.district_id);
  const locationLine = [
    district ? label(district) : null,
    region ? label(region) : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const status = property.verification_status;
  const decided = status === "verified" || status === "pending";

  return (
    <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <Link
        href="/profile"
        className="text-small text-ink-secondary hover:text-registry mb-4 inline-block"
      >
        ← {t("back")}
      </Link>

      <h1 className="text-h1 text-ink mb-1">{t("title")}</h1>
      <p className="text-body text-ink-secondary mb-1">
        {property.address_line}
      </p>
      {locationLine ? (
        <p className="text-small text-ink-muted mb-6">{locationLine}</p>
      ) : (
        <div className="mb-6" />
      )}

      {status === "verified" ? (
        <Alert variant="info">{t("alreadyVerified")}</Alert>
      ) : status === "pending" ? (
        <Alert variant="info">{t("reviewingNote")}</Alert>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="border-rule bg-surface flex flex-col gap-3 rounded-md border p-4">
            <p className="text-body text-ink">{t("whatItProves")}</p>
            <p className="text-small text-ink-secondary">{t("benefit")}</p>
            <p className="text-small text-ink-secondary">{t("howToGet")}</p>
            <p className="text-caption text-ink-muted">{t("deletedAfter")}</p>
          </div>

          {status === "rejected" ? (
            <Alert variant="warning">{t("rejectedResubmit")}</Alert>
          ) : null}

          <VerifyForm propertyId={property.id} />
        </div>
      )}

      {decided ? (
        <Link
          href="/profile"
          className={buttonVariants({ variant: "secondary" }) + " mt-6"}
        >
          {t("back")}
        </Link>
      ) : null}
    </main>
  );
}
