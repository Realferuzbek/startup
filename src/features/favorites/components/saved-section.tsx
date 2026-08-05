import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getFavoriteCards } from "@/features/favorites/queries";
import { getGeographyOptions } from "@/features/properties/queries";
import { photoUrl } from "@/features/discovery/queries";
import { ListingCard } from "@/features/discovery/components/listing-card";
import { UnavailableFavorite } from "@/features/favorites/components/unavailable-favorite";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceWithPeriod } from "@/lib/format";

// "Saqlanganlar" — saved listings, on the profile page at every viewport. A
// favorite whose listing has since expired stays in the list, marked as no
// longer available, rather than vanishing.
export async function SavedSection({ locale }: { locale: string }) {
  const t = await getTranslations("favorites");
  const tn = await getTranslations("nav");

  const [favorites, geo] = await Promise.all([
    getFavoriteCards(),
    getGeographyOptions(),
  ]);

  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;
  const regionName = (id: number | null) => {
    const r = geo.regions.find((x) => x.id === id);
    return r ? label(r) : "";
  };
  const districtName = (id: number | null) => {
    if (id == null) return null;
    const d = geo.districts.find((x) => x.id === id);
    return d ? label(d) : null;
  };

  return (
    <section aria-labelledby="saqlanganlar" className="flex flex-col gap-4">
      <h2 id="saqlanganlar" className="text-h2 text-ink">
        {tn("saved")}
      </h2>

      {favorites.length === 0 ? (
        <EmptyState
          heading={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
              {t("browse")}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => {
            const district = districtName(f.district_id);
            const location = [district, regionName(f.region_id)]
              .filter(Boolean)
              .join(" — ");
            return f.is_available ? (
              <ListingCard
                key={f.listing_id}
                card={{
                  id: f.listing_id,
                  title: f.title,
                  price_amount: Number(f.price_amount),
                  price_currency: f.price_currency,
                  rental_period: f.rental_period,
                  rooms: f.rooms,
                  area_sqm: f.area_sqm !== null ? Number(f.area_sqm) : null,
                  region_id: f.region_id,
                  district_id: f.district_id,
                  verification_status: f.verification_status,
                  created_at: f.created_at,
                  coverUrl: f.cover_path ? photoUrl(f.cover_path) : null,
                }}
                regionName={regionName(f.region_id)}
                districtName={district}
                isFavorited
                signedIn
              />
            ) : (
              <UnavailableFavorite
                key={f.listing_id}
                listingId={f.listing_id}
                title={f.title}
                price={formatPriceWithPeriod(
                  Number(f.price_amount),
                  f.price_currency,
                  f.rental_period,
                  locale,
                )}
                location={location}
                coverUrl={f.cover_path ? photoUrl(f.cover_path) : null}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
