import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import { getGeographyOptions } from "@/features/properties/queries";
import { PropertyForm } from "@/features/properties/components/property-form";

type Props = { params: Promise<{ locale: string }> };

export default async function NewPropertyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser();
  const t = await getTranslations("property");

  const { regions, districts, tashkentCityRegionId } =
    await getGeographyOptions();

  return (
    <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("new")}</h1>
      <PropertyForm
        mode="create"
        locale={locale}
        regions={regions}
        districts={districts}
        tashkentCityRegionId={tashkentCityRegionId}
      />
    </main>
  );
}
