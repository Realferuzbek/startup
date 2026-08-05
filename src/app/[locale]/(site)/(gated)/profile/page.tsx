import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import { MyHomesSection } from "@/features/homes/components/my-homes-section";
import { SavedSection } from "@/features/favorites/components/saved-section";
import { SettingsSection } from "@/features/profile/components/settings-section";
import { Alert } from "@/components/ui/alert";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ submitted?: string }>;
};

// The profile hub: everything the old dashboard held, on one responsive page.
// The sections are composed rather than inlined so the public makler profile
// planned for a later chunk (listing count, member since, ratings) can be added
// above them without reworking this page.
export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { submitted } = await searchParams;
  setRequestLocale(locale);
  const { user, profile } = await requireUser();
  const t = await getTranslations("profile");
  const tv = await getTranslations("verification");

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-8 md:px-6">
      {submitted === "1" ? (
        <Alert variant="info">{tv("submitted")}</Alert>
      ) : null}

      <h1 className="text-h1 text-ink">{t("title")}</h1>

      <MyHomesSection userId={user.id} locale={locale} />
      <SavedSection locale={locale} />
      <SettingsSection
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        telegram={profile?.telegram_username ?? ""}
      />
    </main>
  );
}
