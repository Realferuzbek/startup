import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SearchResultCard } from "@/features/discovery/queries";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { PhotoPlaceholder } from "@/features/discovery/components/photo-placeholder";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { formatPriceWithPeriod, formatArea } from "@/lib/format";

// Whole days since a timestamp. Kept out of the component body — this is a
// server component rendered once per request, so reading the clock here is fine.
function daysSince(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
}

export async function ListingCard({
  card,
  regionName,
  districtName,
  isFavorited = false,
  signedIn = false,
}: {
  card: SearchResultCard;
  regionName: string;
  districtName: string | null;
  isFavorited?: boolean;
  signedIn?: boolean;
}) {
  const t = await getTranslations("discovery");
  const locale = await getLocale();
  const days = daysSince(card.created_at);
  const meta = [
    card.rooms ? t("roomsCount", { count: card.rooms }) : null,
    card.area_sqm ? formatArea(card.area_sqm, locale) : null,
  ].filter(Boolean);

  return (
    <div className="border-rule bg-surface relative flex flex-col rounded-md border transition-colors duration-150 hover:border-rule-strong">
      <Link
        href={`/listings/${card.id}`}
        className="flex flex-col gap-2 rounded-md p-2 focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none"
      >
        <div className="bg-rule relative aspect-[4/3] w-full overflow-hidden rounded-md">
          {card.coverUrl ? (
            <Image
              src={card.coverUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
              className="object-cover"
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-body text-ink line-clamp-1 font-medium">
            {card.title}
          </span>
          {card.verification_status === "verified" ? (
            <VerifiedBadge label={t("verified")} className="shrink-0" />
          ) : null}
        </div>
        <p className="text-price text-ink font-mono">
          {formatPriceWithPeriod(
            card.price_amount,
            card.price_currency,
            card.rental_period,
            locale,
          )}
        </p>
        {meta.length > 0 ? (
          <p className="text-small text-ink-secondary">{meta.join(" · ")}</p>
        ) : null}
        <p className="text-small text-ink-secondary">
          {regionName}
          {districtName ? ` — ${districtName}` : ""}
        </p>
        <p className="text-caption text-ink-muted">
          {t("postedAgo", { days })}
        </p>
      </Link>

      <FavoriteButton
        listingId={card.id}
        initialFavorited={isFavorited}
        signedIn={signedIn}
        locale={locale}
        className="absolute top-3 right-3 z-10"
      />
    </div>
  );
}
