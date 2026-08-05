import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import {
  getAmenities,
  getOwnerProperties,
  getListingForEdit,
} from "@/features/listings/queries";
import { ListingForm } from "@/features/listings/components/listing-form";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await requireUser();
  const t = await getTranslations("listing");

  const result = await getListingForEdit(user.id, id);
  if (!result) {
    notFound();
  }
  const { listing, amenityIds } = result;

  const [amenities, properties] = await Promise.all([
    getAmenities(),
    getOwnerProperties(user.id),
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("edit")}</h1>
      <ListingForm
        mode="edit"
        locale={locale}
        amenities={amenities}
        properties={properties}
        initial={{
          id: listing.id,
          property_id: listing.property_id,
          title: listing.title,
          description: listing.description,
          content_language: listing.content_language,
          price_amount: listing.price_amount,
          price_currency: listing.price_currency,
          rental_period: listing.rental_period,
          rooms: listing.rooms,
          area_sqm: listing.area_sqm,
          floor: listing.floor,
          total_floors: listing.total_floors,
          available_from: listing.available_from,
        }}
        initialAmenityIds={amenityIds}
      />
    </main>
  );
}
