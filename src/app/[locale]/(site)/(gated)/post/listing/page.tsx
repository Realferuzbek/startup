import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/features/auth/session";
import { getAmenities, getOwnerProperties } from "@/features/listings/queries";
import { ListingForm } from "@/features/listings/components/listing-form";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string }> };

export default async function NewListingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requireUser();
  const t = await getTranslations("listing");

  const [amenities, properties] = await Promise.all([
    getAmenities(),
    getOwnerProperties(user.id),
  ]);

  // A listing needs a property. With none, point the user at property creation.
  if (properties.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
        <p className="text-body text-ink-secondary mb-4">{t("noProperties")}</p>
        <Link href="/post" className={buttonVariants({ variant: "primary" })}>
          {t("noPropertiesLink")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("new")}</h1>
      <ListingForm
        mode="create"
        locale={locale}
        amenities={amenities}
        properties={properties}
      />
    </main>
  );
}
