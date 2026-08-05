import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Alert } from "@/components/ui/alert";
import { PhotoPlaceholder } from "@/features/discovery/components/photo-placeholder";
import { formatPriceWithPeriod } from "@/lib/format";
import type { BadgeProps } from "@/components/ui/badge";
import type { Home } from "../queries";
import type { HomeState } from "../state";
import { HomeActions } from "./home-actions";

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// Distinct treatment per state so draft and live never look alike. The
// `verified` variant stays reserved for ownership verification.
const STATE_VARIANT: Record<HomeState, NonNullable<BadgeProps["variant"]>> = {
  draft: "neutral",
  live: "registry",
  paused: "warning",
  expired: "warning",
};

export async function HomeCard({
  home,
  locale,
}: {
  home: Home;
  locale: string;
}) {
  const t = await getTranslations("homes");
  const tl = await getTranslations("listing");
  const tp = await getTranslations("property");
  const tv = await getTranslations("verification");

  // HIDDEN IN CHUNK R1 — ownership verification becomes a premium feature and
  // has no UI entry point for now. The page, tables, RPCs and admin queue are
  // all intact: restore this href together with the commented-out link below.
  // const verifyHref = `/verify/${home.propertyId}`;

  const stateVariant = STATE_VARIANT[home.state];
  const expiringDays =
    home.state === "live" && home.listing?.expires_at
      ? daysUntil(home.listing.expires_at)
      : null;
  const expiringSoon =
    expiringDays !== null && expiringDays > 0 && expiringDays <= 7;

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="bg-rule relative aspect-[16/9] w-full overflow-hidden">
        {home.coverUrl ? (
          <Image
            src={home.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-body text-ink font-medium">{home.addressLine}</p>
            <p className="text-small text-ink-secondary">
              {home.districtName ? `${home.districtName} — ` : ""}
              {home.regionName}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={stateVariant}>{t(`state.${home.state}`)}</Badge>
            {/* Status is still shown for a property that was verified or is
                under review — the public listing page shows the same badge, so
                hiding it here would make the host's own card less truthful.
                What is hidden is the way IN. Restore, with verifyHref above:

                : (
                  // unverified & rejected are both actionable — a quiet link,
                  // never a warning-colored marker (absence is the signal).
                  <Link
                    href={verifyHref}
                    className="text-caption text-registry rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:outline-none"
                  >
                    {home.verificationStatus === "rejected"
                      ? tv("resubmit")
                      : tv("verify")}
                  </Link>
                ) */}
            {home.verificationStatus === "verified" ? (
              <VerifiedBadge label={tp("status.verified")} />
            ) : home.verificationStatus === "pending" ? (
              <Badge variant="neutral">{tv("reviewing")}</Badge>
            ) : null}
          </div>
        </div>

        {home.photoCount === 0 ? (
          <p className="text-caption text-warning">{t("photoNeeded")}</p>
        ) : null}

        {/* Hidden with the verification entry point above — a rejection reason
            is only useful next to a way to resubmit. Restore both together:

            {home.verificationStatus === "rejected" && home.rejectionReason ? (
              <p className="text-caption text-ink-secondary">
                {tv("rejectedLabel")}: {tv(`reason.${home.rejectionReason}`)}
              </p>
            ) : null} */}

        {home.state === "live" && home.listing ? (
          <div className="flex flex-col gap-1">
            <p className="text-price text-ink font-mono">
              {formatPriceWithPeriod(
                home.listing.price_amount,
                home.listing.price_currency,
                home.listing.rental_period,
                locale,
              )}
            </p>
            <p className="text-caption text-ink-muted font-mono">
              {home.listing.expires_at
                ? `${tl("expiresOn")} ${home.listing.expires_at.slice(0, 10)} · `
                : ""}
              {t("views", { count: home.listing.view_count })} ·{" "}
              {t("reveals", { count: home.listing.reveal_count })}
            </p>
          </div>
        ) : null}

        {expiringSoon ? (
          <Alert variant="warning">
            {t("expiringWarning", { days: expiringDays })}
          </Alert>
        ) : null}

        <HomeActions
          state={home.state}
          propertyId={home.propertyId}
          listingId={home.listing?.id ?? null}
          photoCount={home.photoCount}
        />
      </div>
    </Card>
  );
}
