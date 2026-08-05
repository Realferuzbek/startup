import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { LocaleSwitcher } from "@/features/discovery/components/locale-switcher";

// "Sozlamalar" — the contact details a renter sees only after revealing a
// listing's contact, plus language and sign out. The contact form lives here
// because publishing is database-gated on a name and phone being set (CT001),
// so this is the only place a host can clear that blocker.
export async function SettingsSection({
  locale,
  fullName,
  phone,
  telegram,
}: {
  locale: string;
  fullName: string;
  phone: string;
  telegram: string;
}) {
  const t = await getTranslations("profile");
  const tc = await getTranslations("common");

  return (
    <section
      id="sozlamalar"
      aria-labelledby="sozlamalar-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="sozlamalar-heading" className="text-h2 text-ink">
        {t("settings")}
      </h2>
      <p className="text-small text-ink-secondary">{t("help")}</p>

      <ProfileForm
        initialFullName={fullName}
        initialPhone={phone}
        initialTelegram={telegram}
      />

      <div className="border-rule flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <div className="flex items-center gap-3">
          <span className="text-small text-ink-secondary">
            {tc("language")}
          </span>
          <LocaleSwitcher current={locale} />
        </div>
        <SignOutButton />
      </div>
    </section>
  );
}
