import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import { getGeographyOptions } from "@/features/properties/queries";
import { getAmenities } from "@/features/listings/queries";
import { PostForm } from "@/features/post/components/post-form";

type Props = { params: Promise<{ locale: string }> };

// One page, one submit, a live listing. The contact section renders only when
// the profile cannot satisfy the database's CT001 publish gate.
export default async function PostPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await requireUser();
  const t = await getTranslations("post");

  const [geo, amenities] = await Promise.all([
    getGeographyOptions(),
    getAmenities(),
  ]);

  const needsContact = !profile?.full_name?.trim() || !profile?.phone;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="text-h1 text-ink mb-6">{t("title")}</h1>
      <PostForm
        mode="create"
        locale={locale}
        regions={geo.regions}
        districts={geo.districts}
        tashkentCityRegionId={geo.tashkentCityRegionId}
        amenities={amenities}
        needsContact={needsContact}
        contact={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          telegram_username: profile?.telegram_username ?? "",
        }}
      />
    </main>
  );
}
