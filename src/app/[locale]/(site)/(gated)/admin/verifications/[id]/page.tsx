import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getVerificationDetail } from "@/features/verification/queries";
import { VerificationDecision } from "@/features/verification/components/verification-decision";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string; id: string }> };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-ink-muted">{label}</span>
      <span className="text-body text-ink">{value}</span>
    </div>
  );
}

export default async function VerificationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const detail = await getVerificationDetail(id, locale);

  if (!detail) notFound();

  const locationLine = [detail.districtName, detail.regionName]
    .filter(Boolean)
    .join(" — ");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Link
        href="/admin/verifications"
        className="text-small text-ink-secondary hover:text-registry mb-4 inline-block"
      >
        ← {t("queueTitle")}
      </Link>

      <h1 className="text-h1 text-ink mb-6">{t("detailTitle")}</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* The document */}
        <section className="flex flex-col gap-2">
          <span className="text-caption text-ink-muted">{t("document")}</span>
          {detail.documentUrl ? (
            detail.isPdf ? (
              <a
                href={detail.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "secondary" })}
              >
                {t("viewDocument")}
              </a>
            ) : (
              <a
                href={detail.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-rule block overflow-hidden rounded-md border"
              >
                {/*
                  A private, short-lived signed URL — it must NOT pass through
                  the public next/image optimizer (remotePatterns is public-only,
                  and the optimizer would re-serve a cacheable copy). A plain img
                  is deliberate here.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.documentUrl}
                  alt=""
                  className="max-h-[70vh] w-full object-contain"
                />
              </a>
            )
          ) : (
            <p className="text-small text-ink-muted">{t("noDocument")}</p>
          )}
        </section>

        {/* The record + decision */}
        <section className="flex flex-col gap-4">
          <Field label={t("host")} value={detail.hostName ?? "—"} />
          <Field label={t("address")} value={detail.addressLine} />
          {locationLine ? (
            <Field label={t("district")} value={locationLine} />
          ) : null}
          <div className="flex flex-col gap-0.5">
            <span className="text-caption text-ink-muted">
              {t("cadastral")}
            </span>
            <span className="text-body text-ink font-mono">
              {detail.cadastralNumber}
            </span>
          </div>

          <div className="border-rule mt-2 border-t pt-4">
            {detail.status === "pending" ? (
              <VerificationDecision verificationId={detail.id} />
            ) : (
              <Alert
                variant={detail.status === "approved" ? "info" : "warning"}
              >
                {detail.status === "approved"
                  ? t("approved")
                  : `${t("rejected")}${
                      detail.rejectionReason
                        ? ` — ${t(`reason.${detail.rejectionReason}`)}`
                        : ""
                    }${detail.rejectionNote ? `: ${detail.rejectionNote}` : ""}`}
              </Alert>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
