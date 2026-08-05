import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

// "Sozlamalar" — the contact details a renter sees only after revealing a
// listing's contact, then sign out. The contact form lives here because
// publishing is database-gated on a name and phone being set (CT001).
//
// No locale switcher: it is in the header on every page, and a second copy at
// the bottom of one page was pure duplication.
export async function SettingsSection({
  fullName,
  phone,
  telegram,
}: {
  fullName: string;
  phone: string;
  telegram: string;
}) {
  const t = await getTranslations("profile");

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

      <div className="border-rule border-t pt-4">
        <SignOutButton />
      </div>
    </section>
  );
}
