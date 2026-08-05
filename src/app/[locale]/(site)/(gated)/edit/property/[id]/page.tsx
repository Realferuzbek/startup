import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/session";
import { getGeographyOptions } from "@/features/properties/queries";
import { getPropertyPhotos } from "@/features/photos/queries";
import { PropertyForm } from "@/features/properties/components/property-form";
import { PhotoManager } from "@/features/photos/components/photo-manager";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditPropertyPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await requireUser();
  const supabase = await createClient();

  // Read numeric lat/lng from the security_invoker view. RLS + the owner filter
  // ensure only the user's own property loads into the edit form.
  const { data: property } = await supabase
    .from("properties_with_coords")
    .select("id, region_id, district_id, address_line, latitude, longitude")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    !property ||
    property.id == null ||
    property.region_id == null ||
    property.address_line == null ||
    property.latitude == null ||
    property.longitude == null
  ) {
    notFound();
  }

  const { regions, districts, tashkentCityRegionId } =
    await getGeographyOptions();
  const photos = await getPropertyPhotos(user.id, property.id);
  const t = await getTranslations("property");

  return (
    <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("edit")}</h1>
      <PropertyForm
        mode="edit"
        locale={locale}
        regions={regions}
        districts={districts}
        tashkentCityRegionId={tashkentCityRegionId}
        initial={{
          id: property.id,
          region_id: property.region_id,
          district_id: property.district_id,
          address_line: property.address_line,
          latitude: property.latitude,
          longitude: property.longitude,
        }}
      />
      <PhotoManager propertyId={property.id} photos={photos} />
    </main>
  );
}
